import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Schedule, ScheduleDocument } from './schema/schedule.schema';
import { Model, FilterQuery } from 'mongoose';
import { SchedulerRegistry } from '@nestjs/schedule';
import { ScheduleEventHandlerService } from './schedule-event-handler.service';

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

  private getFilter(now: Date, getOnlyDueEvents: boolean): FilterQuery<ScheduleDocument> {
    const filter: FilterQuery<ScheduleDocument> = {
      lockedUntil: { $lt: now },
      numberOfTries: { $lt: 2 },
    };

    if (getOnlyDueEvents) {
      filter.dueAfter = { $lt: now };
    }

    return filter;
  }

  private async fetchAndProcess(): Promise<void> {
    const now = new Date();
    // The event should be locked to other engines
    const lockedUntil = new Date(now.getTime() + 6 * 60_000);

    const filter = this.getFilter(now, true);
    const event = await this.scheduleModel.findOneAndUpdate(
      filter,
      {
        lockedUntil,
        $inc: { numberOfTries: 1 },
      },
      { sort: { dueDate: 1 } },
    );

    if (event) {
      try {
        await this.scheduleEventHandlerService.handleEvent(event);
        await this.scheduleModel.findByIdAndDelete(event._id);
      } catch (error) {
        // Retry in one Minute
        // the document that is retrieved is not updated
        event.dueAfter = new Date(now.getTime() + 60_000);
        await event.save();
      }
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

    // Sets timeout between 0 and 30 minutes
    const nextFetch = nextEvent ? nextEvent.dueAfter.getTime() - now.getTime() : 30 * 60_000;
    const nextFetchInBoundaries = Math.max(Math.min(nextFetch, 30 * 60_000), 0);

    const timeout = setTimeout(async () => await this.fetchAndProcess(), nextFetchInBoundaries);
    this.schedulerRegistry.addTimeout(this.TIMEOUT_NAME, timeout);
  }
}
