export enum ProposalStatus {
  Draft = 'DRAFT',
  Rejected = 'REJECTED',
  Archived = 'ARCHIVED',
  Rework = 'REWORK',
  FdpgCheck = 'FDPG_CHECK',
  LocationCheck = 'LOCATION_CHECK',
  Contracting = 'CONTRACTING',
  ExpectDataDelivery = 'EXPECT_DATA_DELIVERY',
  DataResearch = 'DATA_RESEARCH',
  DataCorrupt = 'DATA_CORRUPT',
  FinishedProject = 'FINISHED_PROJECT',
  ReadyToArchive = 'READY_TO_ARCHIVE',
  ReadyToPublish = 'READY_TO_PUBLISH',
  Published = 'PUBLISHED',
}

export enum ProposalSubstatus {
  Draft = 'DRAFT',
  Rejected = 'REJECTED',
  Rework = 'REWORK',

  FdpgCheckInitialView = 'FDPG_CHECK_INITIAL_VIEW',
  FdpgCheckDepthCheck = 'FDPG_CHECK_DEPTH_CHECK',
  FdpgCheckEthicsCheck = 'FDPG_CHECK_ETHICS_CHECK',
  FdpgCheckDone = 'FDPG_CHECK_DONE',

  LocationCheckVotingInProgress = 'LOCATION_CHECK_VOTING_IN_PROGRESS',
  LocationCheckVotingDone = 'LOCATION_CHECK_VOTING_DONE',

  ContractingResearcherStep = 'CONTRACTING_RESEARCHER_STEP',
  ContractingLocationStep = 'CONTRACTING_LOCATION_STEP',
  ContractingDone = 'CONTRACTING_DONE',

  ExpectDataDeliverySelectDms = 'EXPECT_DATA_DELIVERY_SELECT_DMS',
  ExpectDataDeliveryWaitingForDmsResponse = 'EXPECT_DATA_DELIVERY_WAITING_FOR_DMS_RESPONSE',
  ExpectDataDeliveryDmsDenied = 'EXPECT_DATA_DELIVERY_DMS_DENIED',
  ExpectDataDeliveryEmptyDeliveries = 'EXPECT_DATA_DELIVERY_EMPTY_DELIVIERIES',
  ExpectDataDeliveryPending = 'EXPECT_DATA_DELIVERY_PENDING',
  ExpectDataDeliveryDone = 'EXPECT_DATA_DELIVERY_DONE',

  DataResearch = 'DATA_RESEARCH',
  DataCorrupt = 'DATA_CORRUPT',

  FinishedProject = 'FINISHED_PROJECT',
  ReadyToArchive = 'READY_TO_ARCHIVE',
  ReadyToPublish = 'READY_TO_PUBLISH',
  Published = 'PUBLISHED',
  Archived = 'ARCHIVED',
}
