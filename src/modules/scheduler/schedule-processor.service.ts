import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Schedule, ScheduleDocument } from './schema/schedule.schema';
import { Model, FilterQuery } from 'mongoose';
import { SchedulerRegistry } from '@nestjs/schedule';
import { ScheduleEventHandlerService } from './schedule-event-handler.service';
import { ScheduleType } from './enums/schedule-type.enum';
@Injectable()
export class ScheduleProcessorService {
  constructor(
    @InjectModel(Schedule.name)
    private scheduleModel: Model<ScheduleDocument>,
    private schedulerRegistry: SchedulerRegistry,
    private scheduleEventHandlerService: ScheduleEventHandlerService,
  ) {
    this.scheduleNextFetchAndProcess();
  }

  private readonly TIMEOUT_NAME = 'SCHEDULER_TIMEOUT';
  private readonly logger = new Logger(ScheduleProcessorService.name);

  private getFilter(now: Date, getOnlyDueEvents: boolean): FilterQuery<ScheduleDocument> {
    const filter: FilterQuery<ScheduleDocument> = {
      lockedUntil: { $lt: now },
      numberOfTries: { $lt: 2 },
      type: {
        $nin: [ScheduleType.DailySyncDeliveryInfosSetSubDeliveryStatus, ScheduleType.DailySyncDeliveryInfosFetchResult],
      },
    };

    if (getOnlyDueEvents) {
      filter.dueAfter = { $lt: now };
    }

    return filter;
  }

  private async fetchAndProcess(): Promise<void> {
    const now = new Date();
    const lockedUntil = new Date(now.getTime() + 6 * 60_000);

    const filter = this.getFilter(now, true);

    this.logger.debug(`[fetchAndProcess] Searching for due events at ${now.toISOString()}...`);

    const event = await this.scheduleModel.findOneAndUpdate(
      filter,
      {
        lockedUntil,
        $inc: { numberOfTries: 1 },
      },
      { sort: { dueDate: 1 } },
    );

    if (event) {
      this.logger.log(`[fetchAndProcess] Processing event: ${event._id} (Type: ${event.type})`);

      try {
        await this.scheduleEventHandlerService.handleEvent(event);
        await this.scheduleModel.findByIdAndDelete(event._id);
        this.logger.log(`[fetchAndProcess] Successfully processed and deleted event: ${event._id}`);
      } catch (error) {
        this.logger.error(`[fetchAndProcess] Failed to process event ${event._id}`, error.stack);

        event.dueAfter = new Date(now.getTime() + 60_000);
        await event.save();
        this.logger.warn(`[fetchAndProcess] Event ${event._id} rescheduled for retry in 1 minute.`);
      }
    } else {
      this.logger.debug('[fetchAndProcess] No due events found to process.');
    }

    await this.scheduleNextFetchAndProcess();
  }

  async scheduleNextFetchAndProcess(): Promise<void> {
    const timeoutExists = this.schedulerRegistry.doesExist('timeout', this.TIMEOUT_NAME);
    if (timeoutExists) {
      this.schedulerRegistry.deleteTimeout(this.TIMEOUT_NAME);
    }

    const now = new Date();
    const filter = this.getFilter(now, false);

    const nextEvent = await this.scheduleModel.findOne(filter, null, { sort: { dueAfter: 1 } });

    const maxWaitTime = 30 * 60_000;

    const nextFetchInMs = (() => {
      if (!nextEvent) {
        // CASE A: No events in DB
        this.logger.log(`[Scheduler] No future events found. Sleeping for max time (${maxWaitTime / 60000} mins).`);
        return maxWaitTime;
      } else if (!nextEvent.dueAfter) {
        // CASE B: Event exists but has bad data
        this.logger.warn(
          `[Scheduler] Found event ${nextEvent._id} but 'dueAfter' is missing. skipping to default time.`,
          nextEvent,
        );
        return maxWaitTime;
      } else {
        // CASE C: Event exists - calculate time diff
        // Ensure dueAfter is treated as a Date object
        const dueAfterTime = new Date(nextEvent.dueAfter).getTime();
        const diff = dueAfterTime - now.getTime();

        this.logger.log(`[Scheduler] Next event found: ${nextEvent._id}. Due at: ${nextEvent.dueAfter}`);

        return diff;
      }
    })();

    const nextFetchInBoundaries = Math.max(Math.min(nextFetchInMs, maxWaitTime), 0);

    this.logger.log(
      `[Scheduler] Timer set. Next fetch in ${nextFetchInBoundaries} ms (${(nextFetchInBoundaries / 1000).toFixed(1)}s).`,
    );

    const timeout = setTimeout(async () => await this.fetchAndProcess(), nextFetchInBoundaries);
    this.schedulerRegistry.addTimeout(this.TIMEOUT_NAME, timeout);
  }
}
