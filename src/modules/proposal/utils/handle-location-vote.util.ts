import { MiiLocation } from 'src/shared/constants/mii-locations';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import { getOwner } from 'src/shared/utils/get-owner.util';
import { SetDizApprovalDto } from '../dto/set-diz-approval.dto';
import { SetUacApprovalDto } from '../dto/set-uac-approval.dto';
import { UploadDto } from '../dto/upload.dto';
import { DeclineType } from '../enums/decline-type.enum';
import { FdpgTaskType } from '../enums/fdpg-task-type.enum';
import { Proposal } from '../schema/proposal.schema';
import { ConditionalApproval } from '../schema/sub-schema/conditional-approval.schema';
import { UacApproval } from '../schema/sub-schema/uac-approval.schema';
import { addFdpgTaskAndReturnId, removeFdpgTask } from './add-fdpg-task.util';
import { clearLocationsVotes } from './location-flow.util';
import { getLocationState } from './validate-access.util';
import { ProposalUploadService } from '../services/proposal-upload.service';

export const addDizApproval = (proposal: Proposal, user: IRequestUser, vote: SetDizApprovalDto) => {
  clearLocationsVotes(proposal, user.miiLocation);

  if (vote.value === true) {
    proposal.dizApprovedLocations.push(user.miiLocation);
  } else {
    proposal.requestedButExcludedLocations.push(user.miiLocation);
    proposal.declineReasons = [
      ...proposal.declineReasons,
      {
        location: user.miiLocation,
        reason: vote.declineReason,
        type: DeclineType.DizApprove,
        owner: getOwner(user),
        createdAt: new Date(),
      },
    ];
  }
};

export const addUacApproval = (proposal: Proposal, user: IRequestUser, vote: SetUacApprovalDto) => {
  clearLocationsVotes(proposal, user.miiLocation);

  if (vote.value === true) {
    const uacApproval: Omit<UacApproval, '_id' | 'createdAt' | 'signedAt' | 'signedByOwnerId'> = {
      location: user.miiLocation,
      dataAmount: vote.dataAmount,
      isContractSigned: false,
    };

    // Flow:
    proposal.uacApprovedLocations.push(user.miiLocation);
    // Persistent:
    proposal.uacApprovals.push(uacApproval as UacApproval);
    proposal.totalPromisedDataAmount = (proposal.totalPromisedDataAmount ?? 0) + (vote.dataAmount ?? 0);

    const isDataAmountReached = proposal.totalPromisedDataAmount >= (proposal.requestedData.desiredDataAmount ?? 0);

    if (isDataAmountReached) {
      addFdpgTaskAndReturnId(proposal, FdpgTaskType.DataAmountReached);
    }
  } else {
    proposal.requestedButExcludedLocations.push(user.miiLocation);
    proposal.declineReasons = [
      ...proposal.declineReasons,
      {
        location: user.miiLocation,
        reason: vote.declineReason,
        type: DeclineType.UacApprove,
        owner: getOwner(user),
        createdAt: new Date(),
      },
    ];
  }

  const isUacApprovalComplete =
    proposal.uacApprovedLocations.length + proposal.requestedButExcludedLocations.length ===
    proposal.numberOfRequestedLocations;
  if (isUacApprovalComplete) {
    addFdpgTaskAndReturnId(proposal, FdpgTaskType.UacApprovalComplete);
  }
};

export const addUacApprovalWithCondition = (
  proposal: Proposal,
  location: MiiLocation,
  upload: UploadDto,
  vote: SetUacApprovalDto,
) => {
  const fdpgTaskId = addFdpgTaskAndReturnId(proposal, FdpgTaskType.ConditionApproval);

  const conditionalApproval: Omit<
    ConditionalApproval,
    '_id' | 'createdAt' | 'reviewedAt' | 'reviewedByOwnerId' | 'signedAt' | 'signedByOwnerId'
  > = {
    location: location,
    isAccepted: false,
    uploadId: upload._id,
    dataAmount: vote.dataAmount,
    isContractSigned: false,
    fdpgTaskId,
  };

  if (proposal.conditionalApprovals) {
    proposal.conditionalApprovals.push(conditionalApproval as ConditionalApproval);
  } else {
    proposal.conditionalApprovals = [conditionalApproval as ConditionalApproval];
  }

  // Flow:

  clearLocationsVotes(proposal, location);
  if (vote.value === true) {
    proposal.uacApprovedLocations.push(location);
  } else {
    // Just to be sure. Shouldn't be a conditional approval if false
    proposal.requestedButExcludedLocations.push(location);
  }

  const isUacApprovalComplete =
    proposal.uacApprovedLocations.length + proposal.requestedButExcludedLocations.length ===
    proposal.numberOfRequestedLocations;
  if (isUacApprovalComplete) {
    addFdpgTaskAndReturnId(proposal, FdpgTaskType.UacApprovalComplete);
  }
};

export const addUacConditionReview = (
  proposal: Proposal,
  condition: ConditionalApproval,
  vote: boolean,
  user: IRequestUser,
) => {
  condition.isAccepted = vote;
  condition.reviewedAt = new Date();
  condition.reviewedByOwnerId = user.userId;

  removeFdpgTask(proposal, condition.fdpgTaskId);

  clearLocationsVotes(proposal, condition.location);
  if (vote === true) {
    proposal.totalPromisedDataAmount = (proposal.totalPromisedDataAmount ?? 0) + (condition.dataAmount ?? 0);
    // Flow
    proposal.uacApprovedLocations.push(condition.location);

    const isDataAmountReached = proposal.totalPromisedDataAmount >= (proposal.requestedData.desiredDataAmount ?? 0);
    if (isDataAmountReached) {
      addFdpgTaskAndReturnId(proposal, FdpgTaskType.DataAmountReached);
    }
  } else {
    // Flow
    proposal.requestedButExcludedLocations.push(condition.location);
  }
};

export const handleLocationDecision = async (
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
