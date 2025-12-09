import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ScheduleType } from 'src/modules/scheduler/enums/schedule-type.enum';
import { SchedulerService } from 'src/modules/scheduler/scheduler.service';
import { DeliveryInfoStatus } from '../enums/delivery-info-status.enum';
import { ProposalDataDeliverySyncService } from '../services/data-delivery/proposal-data-delivery-sync.service';
import { ProposalDataDeliveryCrudService } from '../services/data-delivery/proposal-data-delivery-crud.service';

@Injectable()
export class SyncDeliveryInfoCronService {
  private readonly logger = new Logger(SyncDeliveryInfoCronService.name);

  constructor(
    private readonly lockService: SchedulerService,
    private readonly proposalDataDeliverySyncService: ProposalDataDeliverySyncService,
    private readonly proposalDataDeliveryCrudService: ProposalDataDeliveryCrudService,
  ) {}

  private runDeliverySyncCron = async (
    jobType: ScheduleType,
    cb: (jt: ScheduleType) => Promise<PromiseSettledResult<void>[]>,
  ): Promise<void> => {
    const leaseTimeMs = 5 * 60 * 1000; // 5 minutes

    const isLocked = await this.lockService.acquireLock(jobType, leaseTimeMs);

    if (!isLocked) {
      this.logger.debug(`Exiting ${jobType} task. Lock held by another instance.`);
      return;
    }

    try {
      this.logger.log(`Running CRON job: ${jobType}`);

      const cronResults = await cb(jobType);

      const successfullCount = cronResults.filter((it) => it.status === 'fulfilled').length;
      this.logger.log(
        `Completed CRON job: ${jobType}. Successful: ${successfullCount}. Failed: ${cronResults.length - successfullCount}.`,
      );
    } catch (error) {
      this.logger.error(`CRON job ${jobType} failed:`, error.stack);
    }
  };

  private updateSubDeliveryStatuses = async (jobType: ScheduleType) => {
    const proposals = await this.proposalDataDeliveryCrudService.getProposalsWithDeliveriesByStatus(
      DeliveryInfoStatus.PENDING,
    );

    const deliveryPromises = proposals
      .flatMap((proposal) => {
        return proposal.dataDelivery.deliveryInfos
          .filter((deliveryInfo) => deliveryInfo.status === DeliveryInfoStatus.PENDING)
          .filter((deliveryInfo) => !deliveryInfo.manualEntry)
          .map((deliveryInfo) => ({ proposalId: proposal._id, deliveryInfo }));
      })
      .map(async ({ proposalId, deliveryInfo }) => {
        try {
          await this.proposalDataDeliverySyncService.syncSubDeliveryStatusesWithDsf(proposalId, deliveryInfo);
          await this.proposalDataDeliveryCrudService.updateDeliveryInfo(proposalId, deliveryInfo);
        } catch (e) {
          this.logger.error(
            `CRON job ${jobType}: could not sync proposalId ${proposalId} deliveryInfoId ${deliveryInfo._id}. Error:`,
            JSON.stringify(e),
          );
          throw e;
        }
      });

    return await Promise.allSettled(deliveryPromises);
  };

  private updateDeliveryInfoResult = async (jobType: ScheduleType) => {
    const proposals = await this.proposalDataDeliveryCrudService.getProposalsWithDeliveriesByStatus(
      DeliveryInfoStatus.WAITING_FOR_DATA_SET,
    );

    const deliveryPromises = proposals
      .flatMap((proposal) =>
        proposal.dataDelivery.deliveryInfos
          .filter((deliveryInfo) => !deliveryInfo.manualEntry)
          .map((deliveryInfo) => ({ proposalId: proposal._id, deliveryInfo })),
      )
      .map(async ({ proposalId, deliveryInfo }) => {
        try {
          await this.proposalDataDeliverySyncService.syncDeliveryInfoResultWithDsf(proposalId, deliveryInfo);
          await this.proposalDataDeliveryCrudService.updateDeliveryInfo(proposalId, deliveryInfo);
        } catch (e) {
          this.logger.error(
            `CRON job ${jobType}: could not sync proposalId ${proposalId} deliveryInfoId ${deliveryInfo._id}. Error:`,
            JSON.stringify(e),
          );
          throw e;
        }
      });

    return await Promise.allSettled(deliveryPromises);
  };

  // runs at 2:00 AM in Berlin time
  @Cron('0 2 * * *', {
    name: ScheduleType.DailySyncDeliveryInfosSetSubDeliveryStatus,
    timeZone: 'Europe/Berlin',
  })
  async handleDailyDeliveryInfoUpdateSubDeliveriesSync() {
    const jobType = ScheduleType.DailySyncDeliveryInfosSetSubDeliveryStatus;
    await this.runDeliverySyncCron(jobType, this.updateSubDeliveryStatuses);
  }

  // runs at 1:00 AM in Berlin time
  @Cron('0 1 * * *', {
    name: ScheduleType.DailySyncDeliveryInfosFetchResult,
    timeZone: 'Europe/Berlin',
  })
  async handleDailyDeliveryInfoFetchResultsSync() {
    const jobType = ScheduleType.DailySyncDeliveryInfosFetchResult;
    await this.runDeliverySyncCron(jobType, this.updateDeliveryInfoResult);
  }
}
