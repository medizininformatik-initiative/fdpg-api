import { SYSTEM_OWNER_ID } from 'src/shared/constants/global.constants';
import { MiiLocation } from 'src/shared/constants/mii-locations';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import { Proposal } from '../schema/proposal.schema';
import { ConditionalApproval } from '../schema/sub-schema/conditional-approval.schema';
import { UacApproval } from '../schema/sub-schema/uac-approval.schema';
import { addHistoryItemForContractSystemReject, addHistoryItemForUacCondition } from './proposal-history.util';
import { excludeUnselectedLocations } from './unselect-approved-location.util';

export const clearLocationsVotes = (proposal: Proposal, location: MiiLocation) => {
  proposal.openDizChecks = proposal.openDizChecks.filter((filterLocation) => filterLocation !== location);
  proposal.dizApprovedLocations = proposal.dizApprovedLocations.filter((filterLocation) => filterLocation !== location);
  proposal.uacApprovedLocations = proposal.uacApprovedLocations.filter((filterLocation) => filterLocation !== location);
  proposal.signedContracts = proposal.signedContracts.filter((filterLocation) => filterLocation !== location);
  proposal.requestedButExcludedLocations = proposal.requestedButExcludedLocations.filter(
    (filterLocation) => filterLocation !== location,
  );
};

export const excludeAllRequestedLocations = (proposal: Proposal) => {
  proposal.requestedButExcludedLocations = [
    ...new Set([
      ...proposal.requestedButExcludedLocations,
      ...proposal.openDizChecks,
      ...proposal.dizApprovedLocations,
      ...proposal.uacApprovedLocations,
      ...proposal.signedContracts,
    ]),
  ];
  proposal.openDizChecks = [];
  proposal.dizApprovedLocations = [];
  proposal.uacApprovedLocations = [];
  proposal.signedContracts = [];
};

export const declineUnselectedLocations = (
  proposal: Proposal,
  user: IRequestUser,
  selectedLocations: MiiLocation[],
) => {
  proposal.uacApprovals.forEach((approval) => {
    if (!selectedLocations.includes(approval.location)) {
      excludeUnselectedLocations(proposal, user, approval);
    }
  });
  proposal.conditionalApprovals.forEach((condition) => {
    if (!selectedLocations.includes(condition.location)) {
      excludeUnselectedLocations(proposal, user, condition);
    }
  });
};

export const declineUnansweredConditions = (proposal: Proposal, user: IRequestUser) => {
  const locationsToBeExcluded = [];

  proposal.conditionalApprovals.forEach((condition) => {
    if (condition.reviewedAt === undefined) {
      // Excluding in flow:
      locationsToBeExcluded.push(condition.location);
      proposal.requestedButExcludedLocations.push(condition.location);

      // Decline Condition by System
      condition.reviewedAt = new Date();
      condition.reviewedByOwnerId = SYSTEM_OWNER_ID;
      // Just to be sure:
      condition.isAccepted = false;
      condition.isContractSigned = false;

      addHistoryItemForUacCondition(proposal, user, false, condition.location);
    }
  });

  proposal.uacApprovedLocations = proposal.uacApprovedLocations.filter(
    (location) => !locationsToBeExcluded.includes(location),
  );
};

export const declineUnansweredContracts = (proposal: Proposal, user: IRequestUser) => {
  const setAutomatedSigning = (approval: ConditionalApproval | UacApproval) => {
    const isApprovalOrConditionalApprovalAndAccepted = !(
      approval instanceof ConditionalApproval && !approval.isAccepted
    );
    if (approval.signedAt === undefined) {
      approval.signedAt = new Date();
      approval.signedByOwnerId = SYSTEM_OWNER_ID;

      // Just to be sure:
      approval.isContractSigned = false;

      if (isApprovalOrConditionalApprovalAndAccepted) {
        addHistoryItemForContractSystemReject(proposal, user, approval.location);
      }
    }
  };

  proposal.conditionalApprovals.forEach((approval) => setAutomatedSigning(approval));
  proposal.uacApprovals.forEach((approval) => setAutomatedSigning(approval));
};
