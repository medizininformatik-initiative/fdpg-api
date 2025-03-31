import { Injectable } from '@nestjs/common';
import { Proposal } from 'src/modules/proposal/schema/proposal.schema';
import { ScheduleType } from 'src/modules/scheduler/enums/schedule-type.enum';
import { SchedulerService } from 'src/modules/scheduler/scheduler.service';

@Injectable()
export class EmailSummaryCreateService {
  constructor(private schedulerService: SchedulerService) {}

  async createParticipatingScientistSummaryEvent(proposal: Proposal) {
    const participatingSummaryEvents = proposal.scheduledEvents.filter(
      (event) => event.type === ScheduleType.ParticipatingResearcherSummary,
    );

    if (participatingSummaryEvents.length > 0) {
      return;
    }

    if (proposal.participants.length === 0) {
      return;
    }

    await this.schedulerService.createEvents({
      proposal: proposal,
      types: [ScheduleType.ParticipatingResearcherSummary],
    });
  }
}
