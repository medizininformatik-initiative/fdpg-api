import { Injectable } from '@nestjs/common';
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
  declineUnselectedLocations,
  declineUnansweredContracts,
  excludeAllRequestedLocations,
} from '../utils/location-flow.util';
import { ProposalPdfService } from './proposal-pdf.service';

@Injectable()
export class StatusChangeService {
  constructor(
    private schedulerService: SchedulerService,
    private proposalPdfService: ProposalPdfService,
  ) {}

  async handleEffects(
    proposalAfterChanges: Proposal,
    oldStatus: ProposalStatus,
    user: IRequestUser,
    locationList?: string[],
  ): Promise<void> {
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
        if (!proposalAfterChanges.fdpgChecklist)
          proposalAfterChanges.fdpgChecklist = initChecklist({
            isRegistrationLinkSent: false,
            depthCheck: false,
            initialViewing: false,
            ethicsCheck: false,
          });

        proposalAfterChanges.submittedAt = new Date();

        scheduleTypesToAdd.push(ScheduleType.ReminderFdpgCheck, ScheduleType.ParticipatingResearcherSummary);

        await this.proposalPdfService.fetchAndGenerateFeasibilityPdf(proposalAfterChanges, user);
        break;

      case ProposalStatus.LocationCheck:
        proposalAfterChanges.signedContracts = [];
        proposalAfterChanges.dizApprovedLocations = [];
        proposalAfterChanges.openDizConditionChecks = [];
        proposalAfterChanges.uacApprovedLocations = [];
        proposalAfterChanges.requestedButExcludedLocations = [];

        const requestedLocations = [...(proposalAfterChanges.userProject.addressees?.desiredLocations || [])];

        console.log({ requestedLocations });

        proposalAfterChanges.openDizChecks = requestedLocations;
        proposalAfterChanges.numberOfRequestedLocations = proposalAfterChanges.openDizChecks?.length || 0;

        proposalAfterChanges.statusChangeToLocationCheckAt = new Date();

        scheduleTypesToRemove.push(ScheduleType.ReminderFdpgCheck);
        scheduleTypesToAdd.push(
          ScheduleType.ReminderLocationCheck1,
          ScheduleType.ReminderLocationCheck2,
          ScheduleType.ReminderLocationCheck3,
          ScheduleType.ParticipatingResearcherSummary,
        );
        break;

      case ProposalStatus.Contracting:
        // Decline method needs to be at first
        declineUnansweredConditions(proposalAfterChanges, user);
        declineUnselectedLocations(proposalAfterChanges, user, locationList);

        proposalAfterChanges.requestedButExcludedLocations = [
          ...new Set([
            ...(proposalAfterChanges.requestedButExcludedLocations || []),
            ...(proposalAfterChanges.openDizChecks || []),
            ...(proposalAfterChanges.dizApprovedLocations || []),
            ...(proposalAfterChanges.signedContracts || []),
            ...(proposalAfterChanges.openDizConditionChecks || []),
          ]),
        ];

        proposalAfterChanges.uacApprovedLocations = (proposalAfterChanges.uacApprovedLocations || []).filter(
          (approvedLocation) => !proposalAfterChanges.requestedButExcludedLocations.includes(approvedLocation),
        );

        proposalAfterChanges.openDizChecks = [];
        proposalAfterChanges.dizApprovedLocations = [];
        proposalAfterChanges.signedContracts = [];

        proposalAfterChanges.numberOfApprovedLocations = proposalAfterChanges.uacApprovedLocations?.length || 0;
        removeFdpgTasksForContracting(proposalAfterChanges);

        scheduleTypesToRemove.push(
          ScheduleType.ReminderLocationCheck1,
          ScheduleType.ReminderLocationCheck2,
          ScheduleType.ReminderLocationCheck3,
        );
        scheduleTypesToAdd.push(ScheduleType.ParticipatingResearcherSummary);
        break;

      case ProposalStatus.ExpectDataDelivery:
        declineUnansweredContracts(proposalAfterChanges, user);

        proposalAfterChanges.requestedButExcludedLocations = [
          ...new Set([
            ...(proposalAfterChanges.requestedButExcludedLocations || []),
            ...(proposalAfterChanges.openDizChecks || []),
            ...(proposalAfterChanges.dizApprovedLocations || []),
            ...(proposalAfterChanges.uacApprovedLocations || []),
            ...(proposalAfterChanges.openDizConditionChecks || []),
          ]),
        ];
        proposalAfterChanges.openDizChecks = [];
        proposalAfterChanges.dizApprovedLocations = [];
        proposalAfterChanges.uacApprovedLocations = [];
        proposalAfterChanges.openDizConditionChecks = [];

        // We leave untouched: proposalAfterChanges.signedContracts

        proposalAfterChanges.numberOfSignedLocations = proposalAfterChanges.signedContracts?.length || 0;

        removeFdpgTasksForDataDelivery(proposalAfterChanges);
        scheduleTypesToAdd.push(ScheduleType.ParticipatingResearcherSummary);
        break;

      case ProposalStatus.DataResearch:
        scheduleTypesToAdd.push(
          ScheduleType.ReminderResearcherPublications,
          ScheduleType.ParticipatingResearcherSummary,
        );
        break;

      case ProposalStatus.DataCorrupt:
        scheduleTypesToRemove.push(ScheduleType.ReminderResearcherPublications);
        break;

      case ProposalStatus.FinishedProject:
        scheduleTypesToRemove.push(ScheduleType.ReminderResearcherPublications);
        scheduleTypesToAdd.push(ScheduleType.ParticipatingResearcherSummary);
        break;

      case ProposalStatus.ReadyToArchive:
      case ProposalStatus.Archived:
      case ProposalStatus.Draft:
        break;

      case ProposalStatus.Rejected:
        excludeAllRequestedLocations(proposalAfterChanges);
        await this.schedulerService.cancelEventsForProposal(proposalAfterChanges);
        scheduleTypesToAdd.push(ScheduleType.ParticipatingResearcherSummary);
        break;
    }

    await this.schedulerService.cancelEventsByTypesForProposal(proposalAfterChanges, scheduleTypesToRemove);
    await this.schedulerService.createEvents({ proposal: proposalAfterChanges, types: scheduleTypesToAdd });
  }
}
