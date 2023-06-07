import { Injectable } from '@nestjs/common';
import { ALL_ACTIVE_LOCATIONS } from 'src/shared/constants/mii-locations';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import { ScheduleType } from '../../scheduler/enums/schedule-type.enum';
import { SchedulerService } from '../../scheduler/scheduler.service';
import { initChecklist } from '../dto/proposal/fdpg-checklist.dto';
import { ProposalStatus } from '../enums/proposal-status.enum';
import { Proposal } from '../schema/proposal.schema';
import { removeFdpgTasksForContracting, removeFdpgTasksForDataDelivery } from '../utils/add-fdpg-task.util';
import { setDueDate } from '../utils/due-date.util';
import {
  declineUnansweredConditions,
  declineUnansweredContracts,
  excludeAllRequestedLocations,
} from '../utils/location-flow.util';

@Injectable()
export class StatusChangeService {
  constructor(private schedulerService: SchedulerService) {}

  async handleEffects(proposalAfterChanges: Proposal, oldStatus: ProposalStatus, user: IRequestUser): Promise<void> {
    if (proposalAfterChanges.status === oldStatus) {
      return;
    }
    setDueDate(proposalAfterChanges);
    const scheduleTypesToAdd: ScheduleType[] = [];
    const scheduleTypesToRemove: ScheduleType[] = [];

    switch (proposalAfterChanges.status) {
      case ProposalStatus.Rework:
        scheduleTypesToRemove.push(ScheduleType.ReminderFdpgCheck);
        break;

      case ProposalStatus.FdpgCheck:
        proposalAfterChanges.version.mayor++;
        proposalAfterChanges.version.minor = 0;
        proposalAfterChanges.fdpgChecklist = initChecklist({});

        proposalAfterChanges.submittedAt = new Date();

        scheduleTypesToAdd.push(ScheduleType.ReminderFdpgCheck);
        break;

      case ProposalStatus.LocationCheck:
        proposalAfterChanges.signedContracts = [];
        proposalAfterChanges.dizApprovedLocations = [];
        proposalAfterChanges.uacApprovedLocations = [];
        proposalAfterChanges.requestedButExcludedLocations = [];

        // All active locations get it
        proposalAfterChanges.openDizChecks = [...ALL_ACTIVE_LOCATIONS];
        proposalAfterChanges.numberOfRequestedLocations = proposalAfterChanges.openDizChecks.length;

        proposalAfterChanges.statusChangeToLocationCheckAt = new Date();

        scheduleTypesToRemove.push(ScheduleType.ReminderFdpgCheck);
        scheduleTypesToAdd.push(
          ScheduleType.ReminderLocationCheck1,
          ScheduleType.ReminderLocationCheck2,
          ScheduleType.ReminderLocationCheck3,
        );
        break;

      case ProposalStatus.Contracting:
        // Decline method needs to be at first
        declineUnansweredConditions(proposalAfterChanges, user);

        proposalAfterChanges.requestedButExcludedLocations = [
          ...proposalAfterChanges.requestedButExcludedLocations,
          ...proposalAfterChanges.openDizChecks,
          ...proposalAfterChanges.dizApprovedLocations,
          ...proposalAfterChanges.signedContracts,
        ];

        proposalAfterChanges.openDizChecks = [];
        proposalAfterChanges.dizApprovedLocations = [];
        proposalAfterChanges.signedContracts = [];

        // We leave untouched: proposalAfterChanges.uacApprovedLocations

        proposalAfterChanges.numberOfApprovedLocations = proposalAfterChanges.uacApprovedLocations.length;
        removeFdpgTasksForContracting(proposalAfterChanges);

        scheduleTypesToRemove.push(
          ScheduleType.ReminderLocationCheck1,
          ScheduleType.ReminderLocationCheck2,
          ScheduleType.ReminderLocationCheck3,
        );
        break;

      case ProposalStatus.ExpectDataDelivery:
        declineUnansweredContracts(proposalAfterChanges, user);

        proposalAfterChanges.requestedButExcludedLocations = [
          ...proposalAfterChanges.requestedButExcludedLocations,
          ...proposalAfterChanges.openDizChecks,
          ...proposalAfterChanges.dizApprovedLocations,
          ...proposalAfterChanges.uacApprovedLocations,
        ];
        proposalAfterChanges.openDizChecks = [];
        proposalAfterChanges.dizApprovedLocations = [];
        proposalAfterChanges.uacApprovedLocations = [];

        // We leave untouched: proposalAfterChanges.signedContracts

        proposalAfterChanges.numberOfSignedLocations = proposalAfterChanges.signedContracts.length;

        removeFdpgTasksForDataDelivery(proposalAfterChanges);
        break;

      case ProposalStatus.DataResearch:
        scheduleTypesToAdd.push(ScheduleType.ReminderResearcherPublications);
        break;

      case ProposalStatus.DataCorrupt:
        scheduleTypesToRemove.push(ScheduleType.ReminderResearcherPublications);
        break;

      case ProposalStatus.FinishedProject:
        scheduleTypesToRemove.push(ScheduleType.ReminderResearcherPublications);
        break;

      case ProposalStatus.ReadyToArchive:
      case ProposalStatus.Archived:
      case ProposalStatus.Draft:
        break;

      case ProposalStatus.Rejected:
        excludeAllRequestedLocations(proposalAfterChanges);
        await this.schedulerService.cancelEventsForProposal(proposalAfterChanges);
        break;
    }

    await this.schedulerService.cancelEventsByTypesForProposal(proposalAfterChanges, scheduleTypesToRemove);
    await this.schedulerService.createEvents({ proposal: proposalAfterChanges, types: scheduleTypesToAdd });
  }
}
