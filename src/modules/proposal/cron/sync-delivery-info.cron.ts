import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ScheduleType } from 'src/modules/scheduler/enums/schedule-type.enum';
import { SchedulerService } from 'src/modules/scheduler/scheduler.service';
import { ProposalDataDeliveryService } from '../services/proposal-data-delivery.service';
import { DeliveryInfoStatus } from '../enums/delivery-info-status.enum';

@Injectable()
export class SyncDeliveryInfoCronService {
  private readonly logger = new Logger(SyncDeliveryInfoCronService.name);

  constructor(
    private readonly lockService: SchedulerService,
    private readonly proposalDataDeliveryService: ProposalDataDeliveryService,
  ) {}

  // runs at 2:00 AM in Berlin time
  @Cron('0 2 * * *', {
    name: ScheduleType.DailySyncDeliveryInfos,
    timeZone: 'Europe/Berlin',
  })
  async handleDailyDeliveryInfoSync() {
    const jobType = ScheduleType.DailySyncDeliveryInfos;
    const leaseTimeMs = 5 * 60 * 1000; // 5 minutes

    const isLocked = await this.lockService.acquireLock(jobType, leaseTimeMs);

    if (!isLocked) {
      this.logger.debug(`Exiting ${jobType} task. Lock held by another instance.`);
      return;
    }

    try {
      this.logger.log(`Running CRON job: ${jobType}`);
      const proposals = await this.proposalDataDeliveryService.getProposalsWithDeliveriesPending();

      const deliveryPromises = proposals
        .flatMap((proposal) => {
          return proposal.dataDelivery.deliveryInfos
            .filter((deliveryInfo) => deliveryInfo.status === DeliveryInfoStatus.PENDING)
            .map((deliveryInfo) => ({ proposalId: proposal._id, deliveryInfo }));
        })
        .map(async ({ proposalId, deliveryInfo }) => {
          try {
            await this.proposalDataDeliveryService.syncDeliveryInfoWithDsf(proposalId, deliveryInfo);
          } catch (e) {
            this.logger.error(
              `CRON job ${jobType}: could not sync proposalId ${proposalId} deliveryInfoId ${deliveryInfo._id}. Error:`,
              JSON.stringify(e),
            );
            throw e;
          }
        });

      const cronResults = await Promise.allSettled(deliveryPromises);

      const successfullCount = cronResults.filter((it) => it.status === 'fulfilled').length;
      this.logger.log(
        `Completed CRON job: ${jobType}. Successful: ${successfullCount}. Failed: ${cronResults.length - successfullCount}.`,
      );
    } catch (error) {
      this.logger.error(`CRON job ${jobType} failed:`, error.stack);
    }
  }
}
