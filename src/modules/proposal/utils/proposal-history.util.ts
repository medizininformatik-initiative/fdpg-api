import { MiiLocation } from 'src/shared/constants/mii-locations';
import { Role } from 'src/shared/enums/role.enum';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import { HistoryEventType } from '../enums/history-event.enum';
import { ProposalStatus } from '../enums/proposal-status.enum';
import { Proposal } from '../schema/proposal.schema';
import { HistoryEvent } from '../schema/sub-schema/history-event.schema';
import { DueDateEnum } from '../enums/due-date.enum';
import { Participant } from '../schema/sub-schema/participant.schema';
import { HistoryEventDataMap } from '../types/history-event-data-map.type';

const pushHistoryItem = <T extends HistoryEventType>(
  proposalAfterChanges: Proposal,
  user: IRequestUser,
  type: T,
  location?: MiiLocation,
  data?: HistoryEventDataMap<T>,
) => {
  const event: HistoryEvent = {
    type,
    location,
    data: data ?? {},
    owner: {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      id: user.userId,
      miiLocation: user.miiLocation,
      role: user.singleKnownRole,
    },
    proposalVersion: proposalAfterChanges.version,
    createdAt: new Date(),
  };

  proposalAfterChanges.history = [...proposalAfterChanges.history, event];
};

export const addHistoryItemForStatus = (
  proposalAfterChanges: Proposal,
  user: IRequestUser,
  oldStatus?: ProposalStatus,
): void => {
  if (proposalAfterChanges.status === oldStatus) {
    return;
  }
  let type: HistoryEventType;

  switch (proposalAfterChanges.status) {
    case ProposalStatus.Draft:
      type = HistoryEventType.ProposalCreated;
      break;
    case ProposalStatus.FdpgCheck:
      type = HistoryEventType.ProposalFdpgCheck;
      break;
    case ProposalStatus.Rework:
      type = HistoryEventType.ProposalRework;
      break;
    case ProposalStatus.Rejected:
      type = HistoryEventType.ProposalRejected;
      break;
    case ProposalStatus.LocationCheck:
      type = HistoryEventType.ProposalLocationCheck;
      break;
    case ProposalStatus.Contracting:
      type = HistoryEventType.ProposalContracting;
      break;
    case ProposalStatus.ExpectDataDelivery:
      type = HistoryEventType.ProposalDataDelivery;
      break;
    case ProposalStatus.DataResearch:
      type = HistoryEventType.ProposalDataResearch;
      break;
    case ProposalStatus.DataCorrupt:
      type = HistoryEventType.ProposalDataCorrupt;
      break;
    case ProposalStatus.FinishedProject:
      type = HistoryEventType.ProposalFinished;
      break;
    case ProposalStatus.ReadyToArchive:
      type = HistoryEventType.ProposalReadyToArchive;
      break;
    case ProposalStatus.Archived:
      type = HistoryEventType.ProposalArchived;
      break;
  }

  if (type) {
    pushHistoryItem(proposalAfterChanges, user, type);
  }
};

export const addHistoryItemForDizApproval = (
  proposalAfterChanges: Proposal,
  user: IRequestUser,
  vote: boolean,
): void => {
  const type = vote ? HistoryEventType.DizVoteAccept : HistoryEventType.DizVoteDecline;
  pushHistoryItem(proposalAfterChanges, user, type, user.miiLocation);
};

export const addHistoryItemForUacApproval = (
  proposalAfterChanges: Proposal,
  user: IRequestUser,
  vote: boolean,
  hasCondition: boolean,
): void => {
  let type: HistoryEventType;

  if (!vote) {
    type = HistoryEventType.UacVoteDecline;
  } else if (hasCondition) {
    type = HistoryEventType.UacVoteConditionalAccept;
  } else {
    type = HistoryEventType.UacVoteAccept;
  }

  pushHistoryItem(proposalAfterChanges, user, type, user.miiLocation);
};

export const addHistoryItemForDizConditionReviewApproval = (
  proposalAfterChanges: Proposal,
  user: IRequestUser,
  vote: boolean,
  hasCondition: boolean,
): void => {
  let type: HistoryEventType;

  if (!vote) {
    type = HistoryEventType.DizDeclinedOnConditions;
  } else if (hasCondition) {
    type = HistoryEventType.DizAcceptedWithConditions;
  } else {
    type = HistoryEventType.DizAcceptedWithoutConditions;
  }

  pushHistoryItem(proposalAfterChanges, user, type, user.miiLocation);
};

export const addHistoryItemForUacCondition = (
  proposalAfterChanges: Proposal,
  user: IRequestUser,
  vote: boolean,
  location: MiiLocation,
): void => {
  const type = vote ? HistoryEventType.UacConditionAccept : HistoryEventType.UacConditionDecline;

  pushHistoryItem(proposalAfterChanges, user, type, location);
};

export const addHistoryItemForUnselectedLocation = (
  proposalAfterChanges: Proposal,
  user: IRequestUser,
  location: MiiLocation,
): void => {
  const type = HistoryEventType.FdpgApprovedLocationRemoved;

  pushHistoryItem(proposalAfterChanges, user, type, location);
};

export const addHistoryItemForRevertLocationVote = (
  proposalAfterChanges: Proposal,
  user: IRequestUser,
  location: MiiLocation,
): void => {
  const type = HistoryEventType.FdpgLocationVoteReverted;

  pushHistoryItem(proposalAfterChanges, user, type, location);
};

export const addHistoryItemForContractSign = (
  proposalAfterChanges: Proposal,
  user: IRequestUser,
  vote: boolean,
): void => {
  let type: HistoryEventType;
  if (user.singleKnownRole === Role.Researcher) {
    type = vote ? HistoryEventType.ContractResearcherApproved : HistoryEventType.ContractResearcherRejected;
  } else {
    type = vote ? HistoryEventType.ContractLocationApproved : HistoryEventType.ContractLocationRejected;
  }

  pushHistoryItem(proposalAfterChanges, user, type, user.miiLocation);
};

export const addHistoryItemForContractSystemReject = (
  proposalAfterChanges: Proposal,
  user: IRequestUser,
  location: MiiLocation,
): void => {
  const type = HistoryEventType.ContractSystemRejected;
  pushHistoryItem(proposalAfterChanges, user, type, location);
};

export const addHistoryItemForProposalLock = (
  proposalAfterChanges: Proposal,
  user: IRequestUser,
  isLocked: boolean,
): void => {
  const type = isLocked ? HistoryEventType.ProposalLockTrue : HistoryEventType.ProposalLockFalse;
  pushHistoryItem(proposalAfterChanges, user, type);
};

export const addHistoryItemForChangedDeadline = (deadlineType: DueDateEnum, proposal: Proposal, user: IRequestUser) => {
  const type = (() => {
    switch (deadlineType) {
      case DueDateEnum.DUE_DAYS_FDPG_CHECK:
        return HistoryEventType.FdpgDeadlineChange;
      case DueDateEnum.DUE_DAYS_LOCATION_CHECK:
        return HistoryEventType.LocationCheckDeadlineChange;
      case DueDateEnum.DUE_DAYS_LOCATION_CONTRACTING:
        return HistoryEventType.LocationContractingDeadlineChange;
      case DueDateEnum.DUE_DAYS_EXPECT_DATA_DELIVERY:
        return HistoryEventType.ExpectDataDeliveryDeadlineChange;
      case DueDateEnum.DUE_DAYS_DATA_CORRUPT:
        return HistoryEventType.DataCorruptDeadlineChange;
      case DueDateEnum.DUE_DAYS_FINISHED_PROJECT:
        return HistoryEventType.FinishedProjectDeadlineChange;
      default:
        return null;
    }
  })();

  if (!type) {
    console.error(`Could not determine DueDateEnum for history change on proposal ${proposal._id}`);
    return;
  }

  pushHistoryItem(proposal, user, type);
};

export const addHistoryItemForContractUpdate = (proposal: Proposal, user: IRequestUser) => {
  const type = HistoryEventType.ContractUpdated;

  pushHistoryItem(proposal, user, type);
};

export const addHistoryItemForParticipantAdded = (
  proposal: Proposal,
  user: IRequestUser,
  participant: Participant,
): void => {
  const type = HistoryEventType.ParticipantAdded;
  const participantName = `${participant.researcher?.firstName || ''} ${participant.researcher?.lastName || ''}`.trim();
  pushHistoryItem(proposal, user, type, undefined, { participantName });
};

export const addHistoryItemForParticipantRemoved = (
  proposal: Proposal,
  user: IRequestUser,
  participant: Participant,
): void => {
  const type = HistoryEventType.ParticipantRemoved;
  const participantName = `${participant.researcher?.firstName || ''} ${participant.researcher?.lastName || ''}`.trim();
  pushHistoryItem(proposal, user, type, undefined, { participantName });
};

export const addHistoryItemForParticipantsUpdated = (
  proposal: Proposal,
  user: IRequestUser,
  oldParticipants: Participant[],
  newParticipants: Participant[],
): void => {
  const getParticipantKey = (p: Participant) => p.researcher?.email;

  const oldParticipantMap = new Map(oldParticipants.map((p) => [getParticipantKey(p), p]));
  const newParticipantMap = new Map(newParticipants.map((p) => [getParticipantKey(p), p]));

  let hasChanges = false;

  for (const [key, participant] of oldParticipantMap) {
    if (!newParticipantMap.has(key)) {
      addHistoryItemForParticipantRemoved(proposal, user, participant);
      hasChanges = true;
    }
  }

  for (const [key, participant] of newParticipantMap) {
    if (!oldParticipantMap.has(key)) {
      addHistoryItemForParticipantAdded(proposal, user, participant);
      hasChanges = true;
    }
  }

  // If no specific additions/removals but lengths or content changed, log a general update
  if (
    !hasChanges &&
    (oldParticipants.length !== newParticipants.length ||
      JSON.stringify(oldParticipants) !== JSON.stringify(newParticipants))
  ) {
    const type = HistoryEventType.ParticipantUpdated;
    pushHistoryItem(proposal, user, type);
  }
};
