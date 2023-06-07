import { Injectable } from '@nestjs/common';
import { EventEngineService } from '../event-engine/event-engine.service';
import { ScheduleType } from './enums/schedule-type.enum';
import { Schedule } from './schema/schedule.schema';

@Injectable()
export class ScheduleEventHandlerService {
  constructor(private eventEngineService: EventEngineService) {}

  async handleEvent(event: Schedule): Promise<void> {
    const proposalStatusEvents = [
      ScheduleType.ReminderFdpgCheck,
      ScheduleType.ReminderLocationCheck1,
      ScheduleType.ReminderLocationCheck2,
      ScheduleType.ReminderLocationCheck3,
      ScheduleType.ReminderResearcherPublications,
    ];

    if (proposalStatusEvents.includes(event.type)) {
      await this.eventEngineService.handleProposalStatusSchedule(event);
    }
  }
}
