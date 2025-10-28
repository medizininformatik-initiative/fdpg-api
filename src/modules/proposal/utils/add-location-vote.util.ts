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
import {
  setUacApprovalDelayStatus,
  setConditionalApprovalDelayStatus,
  setDeclineReasonDelayStatus,
} from './uac-delay-tracking.util';

export const addDizApproval = (proposal: Proposal, user: IRequestUser, vote: SetDizApprovalDto) => {
  clearLocationsVotes(proposal, user.miiLocation);

  if (vote.value === true) {
    proposal.dizApprovedLocations.push(user.miiLocation);
  } else {
    proposal.requestedButExcludedLocations.push(user.miiLocation);
    const declineReason = {
      location: user.miiLocation,
      reason: vote.declineReason,
      type: DeclineType.DizApprove,
      owner: getOwner(user),
      createdAt: new Date(),
      isLate: false,
    };

    setDeclineReasonDelayStatus(declineReason as any, proposal);

    proposal.declineReasons = [...proposal.declineReasons, declineReason];
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
      '_id' | 'createdAt' | 'reviewedAt' | 'reviewedByOwnerId' | 'signedAt' | 'signedByOwnerId' | 'isLate'
    > = {
      location,
      isAccepted: false,
      uploadId: upload?._id,
      dataAmount: undefined,
      isContractSigned: false,
      conditionReasoning,
    };

    (conditionalApproval as ConditionalApproval).createdAt = new Date();
    setConditionalApprovalDelayStatus(conditionalApproval as ConditionalApproval, proposal);

    if (proposal.locationConditionDraft) {
      proposal.locationConditionDraft.push(conditionalApproval as ConditionalApproval);
    } else {
      proposal.locationConditionDraft = [conditionalApproval as ConditionalApproval];
    }

    proposal.openDizConditionChecks.push(location);
  } else {
    proposal.requestedButExcludedLocations.push(location);
    const declineReason = {
      location: user.miiLocation,
      reason: vote.declineReason,
      type: DeclineType.UacApprove,
      owner: getOwner(user),
      createdAt: new Date(),
      isLate: false,
    };

    setDeclineReasonDelayStatus(declineReason as any, proposal);

    proposal.declineReasons = [...proposal.declineReasons, declineReason];
  }
};

export const addDizConditionApproval = (proposal: Proposal, user: IRequestUser, vote: SetDizConditionApprovalDto) => {
  clearLocationsVotes(proposal, user.miiLocation);

  proposal.locationConditionDraft = proposal.locationConditionDraft.filter(
    (condition) => condition.location !== user.miiLocation,
  );
  proposal.conditionalApprovals = proposal.conditionalApprovals.filter(
    (condition) => condition.location !== user.miiLocation,
  );

  if (vote.value === true) {
    const uacApproval: Omit<UacApproval, '_id' | 'createdAt' | 'signedAt' | 'signedByOwnerId' | 'isLate'> = {
      location: user.miiLocation,
      dataAmount: vote.dataAmount,
      isContractSigned: false,
    };

    (uacApproval as UacApproval).createdAt = new Date();
    setUacApprovalDelayStatus(uacApproval as UacApproval, proposal);

    // Flow:
    proposal.uacApprovedLocations.push(user.miiLocation);
    // Persistent:
    proposal.uacApprovals.push(uacApproval as UacApproval);
    proposal.totalPromisedDataAmount = calculateDataAmount(proposal);

    const isDataAmountReached = proposal.totalPromisedDataAmount >= (proposal.requestedData?.desiredDataAmount ?? 0);

    if (isDataAmountReached) {
      addFdpgTaskAndReturnId(proposal, FdpgTaskType.DataAmountReached);
    }
  } else {
    proposal.requestedButExcludedLocations.push(user.miiLocation);
    const declineReason = {
      location: user.miiLocation,
      reason: vote.declineReason,
      type: DeclineType.UacApprove,
      owner: getOwner(user),
      createdAt: new Date(),
      isLate: false,
    };

    setDeclineReasonDelayStatus(declineReason as any, proposal);

    proposal.declineReasons = [...proposal.declineReasons, declineReason];
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

  clearLocationsVotes(proposal, location);

  const conditionalApproval: Omit<
    ConditionalApproval,
    '_id' | 'createdAt' | 'reviewedAt' | 'reviewedByOwnerId' | 'signedAt' | 'signedByOwnerId' | 'isLate'
  > = {
    location: location,
    isAccepted: false,
    dataAmount: vote.dataAmount,
    isContractSigned: false,
    conditionReasoning: conditionReasoning,
    fdpgTaskId,
  };

  (conditionalApproval as ConditionalApproval).createdAt = new Date();
  setConditionalApprovalDelayStatus(conditionalApproval as ConditionalApproval, proposal);

  if (vote.value === true) {
    if (proposal.locationConditionDraft) {
      proposal.locationConditionDraft = proposal.locationConditionDraft.filter(
        (condition) => condition.location !== location,
      );
    }

    proposal.conditionalApprovals = proposal.conditionalApprovals.filter(
      (condition) => condition.location !== location,
    );

    if (proposal.conditionalApprovals) {
      proposal.conditionalApprovals.push(conditionalApproval as ConditionalApproval);
    } else {
      proposal.conditionalApprovals = [conditionalApproval as ConditionalApproval];
    }

    // Flow:
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
    // Flow

    proposal.conditionalApprovals = [
      ...proposal.conditionalApprovals.filter(
        (conditionalApproval) => conditionalApproval.location != condition.location,
      ),
      condition,
    ];
    proposal.uacApprovedLocations.push(condition.location);

    proposal.totalPromisedDataAmount = calculateDataAmount(proposal);

    const isDataAmountReached = proposal.totalPromisedDataAmount >= (proposal.requestedData?.desiredDataAmount ?? 0);
    if (isDataAmountReached) {
      addFdpgTaskAndReturnId(proposal, FdpgTaskType.DataAmountReached);
    }
  } else {
    // Flow
    proposal.requestedButExcludedLocations.push(condition.location);
  }
};

const calculateDataAmount = (proposal: Proposal) => {
  const uacApprovalAmount = proposal.uacApprovals
    .map((approval) => approval.dataAmount)
    .reduce((acc, cur) => acc + cur, 0);
  const conditionalApprovalAmount = proposal.conditionalApprovals
    .filter((conditionalApproval) => conditionalApproval.isAccepted && conditionalApproval.reviewedAt)
    .map((conditionalApproval) => conditionalApproval.dataAmount)
    .reduce((acc, cur) => acc + cur, 0);

  return uacApprovalAmount + conditionalApprovalAmount;
};
