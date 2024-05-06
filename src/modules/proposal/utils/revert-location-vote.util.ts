import { getLocationState } from './validate-access.util';
import { ProposalUploadService } from '../services/proposal-upload.service';
import { Proposal } from '../schema/proposal.schema';
import { MiiLocation } from 'src/shared/constants/mii-locations';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import { removeFdpgTask } from './add-fdpg-task.util';
import { FdpgTaskType } from '../enums/fdpg-task-type.enum';
import { clearLocationsVotes } from './location-flow.util';

export const revertLocationVote = async (
  proposal: Proposal,
  location: MiiLocation,
  user: IRequestUser,
  proposalUploadService: ProposalUploadService,
) => {
  const locationState = getLocationState(proposal, user);

  let locationDataAmount = 0;

  if (locationState.isConditionalApproval) {
    locationDataAmount =
      proposal.conditionalApprovals.find((approval) => approval.location === location)?.dataAmount ?? 0;
  } else {
    locationDataAmount = proposal.uacApprovals.find((approval) => approval.location === location)?.dataAmount ?? 0;
  }

  proposal.totalPromisedDataAmount = proposal.totalPromisedDataAmount - locationDataAmount;
  const isDataAmountReached = proposal.totalPromisedDataAmount >= (proposal.requestedData.desiredDataAmount ?? 0);

  if (locationState.requestedButExcluded) {
    proposal.declineReasons = proposal.declineReasons.filter((reason) => reason.location !== location);
  }

  if (locationState.uacApproved) {
    proposal.uacApprovals = proposal.uacApprovals.filter((approval) => approval.location !== location);
    if (!isDataAmountReached) {
      removeFdpgTask(proposal, FdpgTaskType.DataAmountReached);
    }
    const isUacApprovalComplete =
      proposal.uacApprovedLocations.length + proposal.requestedButExcludedLocations.length ===
      proposal.numberOfRequestedLocations;
    if (!isUacApprovalComplete) {
      removeFdpgTask(proposal, FdpgTaskType.UacApprovalComplete);
    }
  }

  if (locationState.isConditionalApproval) {
    const uploadId = proposal.conditionalApprovals.find((approval) => approval.location === location)?.uploadId;

    if (uploadId) {
      await proposalUploadService.deleteUpload(proposal._id, uploadId, user);
    }
  }

  if (locationState.conditionalApprovalAccepted) {
    removeFdpgTask(proposal, FdpgTaskType.ConditionApproval);

    proposal.conditionalApprovals = proposal.conditionalApprovals.filter(
      (condition) => condition.location !== location,
    );

    if (!isDataAmountReached) {
      removeFdpgTask(proposal, FdpgTaskType.DataAmountReached);
    }
  }

  clearLocationsVotes(proposal, location);
  proposal.openDizChecks.push(location);
};
