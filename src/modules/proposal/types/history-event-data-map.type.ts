import { HistoryEventType } from '../enums/history-event.enum';

// Add imports for any types needed for data shapes here

export type HistoryEventDataMap = {
  [HistoryEventType.ProposalLockTrue]: undefined;
  [HistoryEventType.ProposalLockFalse]: undefined;
  [HistoryEventType.ProposalCreated]: undefined;
  [HistoryEventType.ProposalFdpgCheck]: undefined;
  [HistoryEventType.ProposalRework]: undefined;
  [HistoryEventType.ProposalRejected]: undefined;
  [HistoryEventType.ProposalLocationCheck]: undefined;
  [HistoryEventType.ProposalContracting]: undefined;
  [HistoryEventType.ProposalDataDelivery]: undefined;
  [HistoryEventType.ProposalDataCorrupt]: undefined;
  [HistoryEventType.ProposalDataResearch]: undefined;
  [HistoryEventType.ProposalFinished]: undefined;
  [HistoryEventType.ProposalReadyToArchive]: undefined;
  [HistoryEventType.ProposalArchived]: undefined;

  [HistoryEventType.DizVoteAccept]: undefined;
  [HistoryEventType.DizVoteDecline]: undefined;
  [HistoryEventType.DizAcceptedWithConditions]: undefined;
  [HistoryEventType.DizAcceptedWithoutConditions]: undefined;
  [HistoryEventType.DizDeclinedOnConditions]: undefined;

  [HistoryEventType.UacVoteAccept]: undefined;
  [HistoryEventType.UacVoteConditionalAccept]: undefined;
  [HistoryEventType.UacVoteDecline]: undefined;
  [HistoryEventType.UacConditionAccept]: undefined;
  [HistoryEventType.UacConditionDecline]: undefined;

  [HistoryEventType.FdpgApprovedLocationRemoved]: undefined;
  [HistoryEventType.FdpgLocationVoteReverted]: undefined;

  [HistoryEventType.ContractResearcherApproved]: undefined;
  [HistoryEventType.ContractResearcherRejected]: undefined;
  [HistoryEventType.ContractLocationApproved]: undefined;
  [HistoryEventType.ContractLocationRejected]: undefined;
  [HistoryEventType.ContractSystemRejected]: undefined;
  [HistoryEventType.ContractUpdated]: undefined;

  [HistoryEventType.ParticipantAdded]: { participantName: string };
  [HistoryEventType.ParticipantRemoved]: { participantName: string };
  [HistoryEventType.ParticipantUpdated]: undefined;

  [HistoryEventType.FdpgDeadlineChange]: undefined;
  [HistoryEventType.LocationCheckDeadlineChange]: undefined;
  [HistoryEventType.LocationContractingDeadlineChange]: undefined;
  [HistoryEventType.ExpectDataDeliveryDeadlineChange]: undefined;
  [HistoryEventType.DataCorruptDeadlineChange]: undefined;
  [HistoryEventType.FinishedProjectDeadlineChange]: undefined;
};
