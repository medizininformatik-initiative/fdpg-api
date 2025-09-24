import { getLocationState } from './validate-access.util';
import { ProposalUploadService } from '../services/proposal-upload.service';
import { ProposalDocument } from '../schema/proposal.schema';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import { removeFdpgTask, removeFdpgTaskByType } from './add-fdpg-task.util';
import { FdpgTaskType } from '../enums/fdpg-task-type.enum';
import { clearLocationsVotes } from './location-flow.util';

export const revertLocationVote = async (
  proposal: ProposalDocument,
  location: string,
  user: IRequestUser,
  proposalUploadService: ProposalUploadService,
) => {
  const locationState = getLocationState(proposal, user);

  const uploadId = proposal.conditionalApprovals?.find((approval) => approval.location === location)?.uploadId;
  const conditionalApprovalFdpgTaskId = proposal.conditionalApprovals?.find(
    (approval) => approval.location === location,
  )?.fdpgTaskId;

  let locationDataAmount = 0;
  if (locationState.conditionalApprovalAccepted) {
    locationDataAmount =
      proposal.conditionalApprovals?.find((approval) => approval.location === location)?.dataAmount ?? 0;
  } else if (!locationState.isConditionalApproval && locationState.uacApproved) {
    locationDataAmount = proposal.uacApprovals?.find((approval) => approval.location === location)?.dataAmount ?? 0;
  }

  proposal.totalPromisedDataAmount = proposal.totalPromisedDataAmount - locationDataAmount;
  proposal.uacApprovals = proposal.uacApprovals?.filter((approval) => approval.location !== location);
  proposal.openDizConditionChecks = proposal.openDizConditionChecks?.filter(
    (checkLocation) => checkLocation !== location,
  );
  proposal.locationConditionDraft = proposal.locationConditionDraft?.filter(
    (condition) => condition.location !== location,
  );
  proposal.conditionalApprovals = proposal.conditionalApprovals?.filter((condition) => condition.location !== location);
  proposal.declineReasons = proposal.declineReasons?.filter((reason) => reason.location !== location);
  clearLocationsVotes(proposal, location);
  proposal.openDizChecks.push(location);

  if (conditionalApprovalFdpgTaskId) {
    removeFdpgTask(proposal, conditionalApprovalFdpgTaskId);
  }

  const isDataAmountReached = proposal.totalPromisedDataAmount >= (proposal.requestedData.desiredDataAmount ?? 0);
  if (!isDataAmountReached) {
    removeFdpgTaskByType(proposal, FdpgTaskType.DataAmountReached);
  }

  removeFdpgTaskByType(proposal, FdpgTaskType.UacApprovalComplete);

  if (uploadId) {
    await proposalUploadService.deleteUpload(proposal, uploadId, user);
  }
};
