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
  ProposalCopyAsInternalRegistration = 'PROPOSAL_COPY_AS_INTERNAL_REGISTRATION',

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
  ContractUpdated = 'CONTRACT_UPDATED',
  ContractingSkipped = 'CONTRACTING_SKIPPED',

  /** Participant Changes */
  ParticipantAdded = 'PARTICIPANT_ADDED',
  ParticipantRemoved = 'PARTICIPANT_REMOVED',
  ParticipantUpdated = 'PARTICIPANT_UPDATED',

  /** Deadline Changes */
  FdpgDeadlineChange = 'FDPG_DEADLINE_CHANGE',
  LocationCheckDeadlineChange = 'LOCATION_CHECK_DEADLINE_CHANGE',
  LocationContractingDeadlineChange = 'LOCATION_CONTRACTING_DEADLINE_CHANGE',
  ExpectDataDeliveryDeadlineChange = 'EXPECT_DATA_DELIVERY_DEADLINE_CHANGE',
  DataCorruptDeadlineChange = 'DATA_CORRUPTED_DEADLINE_CHANGE',
  FinishedProjectDeadlineChange = 'FINISHED_PROJECT_DEADLINE_CHANGE',

  /** Data Delivery */
  DmoRequest = 'DMO_REQUEST', // DMS has been requested
  DmoDeny = 'DMO_DENY', // DMS denied the request
  DmoAccept = 'DMO_ACCEPT', // DMS accepted the request
  DataDeliveryStarted = 'DATA_DELIVERY_STARTED', // FDPG created a new data delivery via DSF
  DataDeliveryManualEntry = 'DATA_DELIVERY_MANUAL_ENTRY', // A manual data delivery was created
  DataDeliveryForwarded = 'DATA_DELIVERY_FORWARDED', // data delivery was forwarded
  DataDeliveryCanceled = 'DATA_DELIVERY_CANCELED', // data delivery was canceled
  DataDeliveryConcluded = 'DATA_DELIVERY_CONCLUDED', // data delivery was finished/concluded

  // Misc
  ProjectAssigneChange = 'FDPG_PROJECT_ASSIGNEE_CHANGE',
}
