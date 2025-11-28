import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Schedule, ScheduleDocument } from './schema/schedule.schema';
import { Model } from 'mongoose';
import { IProposalScheduleEventSet } from './types/schedule-event.types';
import { getEventsFromSet } from './utils/get-events.util';
import { ScheduledEvent } from '../proposal/schema/sub-schema/scheduled-event.schema';
import { ScheduleType } from './enums/schedule-type.enum';
import { Proposal } from '../proposal/schema/proposal.schema';
import { ScheduleProcessorService } from './schedule-processor.service';
import { DueDateEnum } from '../proposal/enums/due-date.enum';
import { Logger } from 'testcontainers/build/common';

@Injectable()
export class SchedulerService {
  constructor(
    @InjectModel(Schedule.name)
    private scheduleModel: Model<ScheduleDocument>,
    private scheduleProcessorService: ScheduleProcessorService,
  ) {}

  private readonly logger = new Logger(SchedulerService.name);

  async createEvents(eventSet: IProposalScheduleEventSet): Promise<void> {
    const events = getEventsFromSet(eventSet);
    await this.scheduleModel.insertMany(events);
    const scheduledEvents = events.map((event) => {
      return {
        scheduleId: event._id,
        type: event.type,
      } as ScheduledEvent;
    });

    eventSet.proposal.scheduledEvents = [...eventSet.proposal.scheduledEvents, ...scheduledEvents];

    await this.scheduleProcessorService.scheduleNextFetchAndProcess();
  }

  async cancelEventByEventId(eventId: string): Promise<void> {
    await this.scheduleModel.findByIdAndDelete(eventId);
  }

  async cancelEventsForProposal(proposal: Proposal): Promise<void> {
    await this.scheduleModel.deleteMany({ referenceDocumentId: proposal._id });
    proposal.scheduledEvents = [];
  }

  async cancelEventsByTypesForProposal(proposal: Proposal, types: ScheduleType[]): Promise<void> {
    if (types?.length > 0) {
      await this.scheduleModel.deleteMany({ referenceDocumentId: proposal._id, type: { $in: types } });
    }

    proposal.scheduledEvents = proposal.scheduledEvents.filter((proposalEvent) => !types.includes(proposalEvent.type));
  }

  async removeAndCreateEventsByChangeList(proposal: Proposal, changeList: Record<DueDateEnum, Date | null>) {
    const changedEvents = new Set(
      Object.keys(changeList).flatMap((key) => this.dueDateToEventMapping(key as DueDateEnum)),
    );

    await this.cancelEventsByTypesForProposal(proposal, [...changedEvents]);
    await this.createEvents({ proposal, types: [...changedEvents] });
  }

  private dueDateToEventMapping = (deadlineType: DueDateEnum): ScheduleType[] => {
    switch (deadlineType) {
      case DueDateEnum.DUE_DAYS_FDPG_CHECK:
        return [ScheduleType.ReminderFdpgCheck];
      case DueDateEnum.DUE_DAYS_LOCATION_CHECK:
        return [
          ScheduleType.ReminderLocationCheck1,
          ScheduleType.ReminderLocationCheck2,
          ScheduleType.ReminderLocationCheck3,
        ];
      case DueDateEnum.DUE_DAYS_LOCATION_CONTRACTING:
      case DueDateEnum.DUE_DAYS_EXPECT_DATA_DELIVERY:
      case DueDateEnum.DUE_DAYS_DATA_CORRUPT:
      case DueDateEnum.DUE_DAYS_FINISHED_PROJECT:
      default:
        return [];
    }
  };

  /**
   * Attempts to acquire a distributed lock for a specific cron job type.
   * @param jobType The ScheduleType representing the cron job ().
   * @param leaseDurationMs How long the lock is held in milliseconds (e.g., 5 minutes = 300000).
   * @returns true if the lock was successfully acquired, false otherwise.
   */
  async acquireLock(jobType: ScheduleType, leaseDurationMs: number): Promise<boolean> {
    const newLockedUntil = new Date(Date.now() + leaseDurationMs);

    try {
      const lockAcquired = await this.scheduleModel
        .findOneAndUpdate(
          {
            type: jobType,
            lockedUntil: { $lt: new Date() },
          },
          {
            $set: {
              lockedUntil: newLockedUntil,
              updatedAt: new Date(),
              numberOfTries: 0,
            },
            $setOnInsert: {
              createdAt: new Date(),
            },
          },
          {
            upsert: true,
            new: true,
          },
        )
        .lean();

      if (lockAcquired) {
        this.logger.debug(`Lock acquired successfully for job type: ${jobType}`);
        return true;
      }

      this.logger.warn(`Lock already held by another instance for job type: ${jobType}`);
      return false;
    } catch (error) {
      this.logger.error(`Error acquiring lock for ${jobType}:`, error.message);
      return false;
    }
  }
}
