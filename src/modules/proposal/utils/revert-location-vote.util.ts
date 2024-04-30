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

  if (locationState.requestedButExcluded) {
    proposal.declineReasons = proposal.declineReasons.filter((reason) => reason.location !== location);
  }

  if (locationState.uacApproved) {
    proposal.uacApprovals = proposal.uacApprovals.filter((approval) => approval.location !== location);
  }

  if (locationState.conditionalApprovalAccepted) {
    removeFdpgTask(proposal, FdpgTaskType.ConditionApproval);

    proposal.conditionalApprovals = proposal.conditionalApprovals.filter(
      (condition) => condition.location !== location,
    );

    const locationDataAmount = proposal.uacApprovals.find((approval) => approval.location === location)?.dataAmount;

    proposal.totalPromisedDataAmount = proposal.totalPromisedDataAmount - locationDataAmount;

    const isDataAmountReached = proposal.totalPromisedDataAmount >= (proposal.requestedData.desiredDataAmount ?? 0);
    if (!isDataAmountReached) {
      removeFdpgTask(proposal, FdpgTaskType.DataAmountReached);
    }
  }
  if (locationState.isConditionalApproval) {
    const uploadId = proposal.conditionalApprovals.find((approval) => approval.location === location)?.uploadId;

    if (uploadId) {
      await proposalUploadService.deleteUpload(proposal._id, uploadId, user);
    }
  }
  clearLocationsVotes(proposal, location);
  proposal.openDizChecks.push(location);
};
