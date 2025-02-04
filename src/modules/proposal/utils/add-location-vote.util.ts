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
import { SetDizConditionApprovalDto } from '../dto/set-diz-condition-approval.dto';

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

export const addUacApprovalWithCondition = (
  proposal: Proposal,
  user: IRequestUser,
  vote: SetUacApprovalDto,
  upload?: UploadDto,
  conditionReasoning?: string,
) => {
  const location = user.miiLocation;

  // Flow:
  clearLocationsVotes(proposal, location);
  if (vote.value === true) {
    const conditionalApproval: Omit<
      ConditionalApproval,
      '_id' | 'createdAt' | 'reviewedAt' | 'reviewedByOwnerId' | 'signedAt' | 'signedByOwnerId'
    > = {
      location,
      isAccepted: false,
      uploadId: upload?._id,
      dataAmount: undefined,
      isContractSigned: false,
      conditionReasoning,
    };

    if (proposal.locationConditionDraft) {
      proposal.locationConditionDraft.push(conditionalApproval as ConditionalApproval);
    } else {
      proposal.locationConditionDraft = [conditionalApproval as ConditionalApproval];
    }

    proposal.openDizConditionChecks.push(location);
  } else {
    proposal.requestedButExcludedLocations.push(location);
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
};

export const addDizConditionApproval = (proposal: Proposal, user: IRequestUser, vote: SetDizConditionApprovalDto) => {
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

export const addDizApprovalWithCondition = (
  proposal: Proposal,
  location: MiiLocation,
  vote: SetDizConditionApprovalDto,
  conditionReasoning: string,
) => {
  const fdpgTaskId = addFdpgTaskAndReturnId(proposal, FdpgTaskType.ConditionApproval);

  const conditionalApproval: Omit<
    ConditionalApproval,
    '_id' | 'createdAt' | 'reviewedAt' | 'reviewedByOwnerId' | 'signedAt' | 'signedByOwnerId'
  > = {
    location: location,
    isAccepted: false,
    dataAmount: vote.dataAmount,
    isContractSigned: false,
    conditionReasoning: conditionReasoning,
    fdpgTaskId,
  };

  if (vote.value === true) {
    if (proposal.locationConditionDraft) {
      proposal.locationConditionDraft = proposal.locationConditionDraft.filter(
        (condition) => condition.location !== location,
      );
    }

    if (proposal.conditionalApprovals) {
      proposal.conditionalApprovals.push(conditionalApproval as ConditionalApproval);
    } else {
      proposal.conditionalApprovals = [conditionalApproval as ConditionalApproval];
    }

    // Flow:

    clearLocationsVotes(proposal, location);
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

export const addDizConditionReview = (
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
