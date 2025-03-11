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

@Injectable()
export class SchedulerService {
  constructor(
    @InjectModel(Schedule.name)
    private scheduleModel: Model<ScheduleDocument>,
    private scheduleProcessorService: ScheduleProcessorService,
  ) {}

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

  async removeAndCreateEventsByChangeList(proposal: Proposal, changeList: Record<DueDateEnum, Date | null>) {}
}
