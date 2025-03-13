export enum HistoryEventType {
  ProposalLockTrue = 'PROPOSAL_LOCK_TRUE',
  ProposalLockFalse = 'PROPOSAL_LOCK_FALSE',
  /** Status Changes */
  ProposalCreated = 'PROPOSAL_CREATING',
  ProposalFdpgCheck = 'PROPOSAL_FDPG_CHECK',
  ProposalRework = 'PROPOSAL_REWORK',
  ProposalRejected = 'PROPOSAL_REJECT',
  ProposalLocationCheck = 'PROPOSAL_LOCATION_CHECK',
  ProposalContracting = 'PROPOSAL_CONTRACTING',
  ProposalDataDelivery = 'PROPOSAL_DATA_DELIVERY',
  ProposalDataCorrupt = 'PROPOSAL_DATA_CORRUPT',
  ProposalDataResearch = 'PROPOSAL_DATA_RESEARCH',
  ProposalFinished = 'PROPOSAL_FINISHED',
  ProposalReadyToArchive = 'PROPOSAL_READY_TO_ARCHIVE',
  ProposalArchived = 'PROPOSAL_ARCHIVED',

  /** DIZ Votes */
  DizVoteAccept = 'DIZ_VOTE_ACCEPT',
  DizVoteDecline = 'DIZ_VOTE_DECLINE',
  DizAcceptedWithConditions = 'DIZ_ACCEPT_WITH_CONDITIONS',
  DizAcceptedWithoutConditions = 'DIZ_ACCEPT_WITHOUT_CONDITIONS',
  DizDeclinedOnConditions = 'DIZ_DECLINE_ON_CONDITIONS',

  /** UAC Votes */
  UacVoteAccept = 'UAC_VOTE_ACCEPT',
  UacVoteConditionalAccept = 'UAC_VOTE_CONDITIONAL_ACCEPT',
  UacVoteDecline = 'UAC_VOTE_DECLINE',
  UacConditionAccept = 'UAC_CONDITION_ACCEPT',
  UacConditionDecline = 'UAC_CONDITION_DECLINE',

  /** FDPG Veto */
  FdpgApprovedLocationRemoved = 'FDPG_APPROVED_LOCATION_REMOVED',

  /** FDPG reverts DIZ and UAC vote */
  FdpgLocationVoteReverted = 'FDPG_LOCATION_VOTE_REVERTED',

  /** Data Delivery */

  /** Contracting */
  ContractResearcherApproved = 'CONTRACT_RESEARCHER_APPROVED',
  ContractResearcherRejected = 'CONTRACT_RESEARCHER_REJECTED',
  ContractLocationApproved = 'CONTRACT_LOCATION_APPROVED',
  ContractLocationRejected = 'CONTRACT_LOCATION_REJECTED',
  ContractSystemRejected = 'CONTRACT_SYSTEM_REJECTED',

  /** Deadline Changes */
  FdpgDeadlineChange = 'FDPG_DEADLINE_CHANGE',
  LocationCheckDeadlineChange = 'LOCATION_CHECK_DEADLINE_CHANGE',
  LocationContractingDeadlineChange = 'LOCATION_CONTRACTING_DEADLINE_CHANGE',
  ExpectDataDeliveryDeadlineChange = 'EXPECT_DATA_DELIVERY_DEADLINE_CHANGE',
  DataCorruptDeadlineChange = 'DATA_CORRUPTED_DEADLINE_CHANGE',
  FinishedProjectDeadlineChange = 'FINISHED_PROJECT_DEADLINE_CHANGE',
}
