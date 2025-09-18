export enum PanelQuery {
  // General
  Archived = 'ARCHIVED',

  // Researcher
  Draft = 'DRAFT',
  ResearcherPending = 'RESEARCHER_PENDING',
  ResearcherOngoing = 'RESEARCHER_ONGOING',
  ResearcherFinished = 'RESEARCHER_FINISHED',

  // DIZ
  DizPending = 'DIZ_PENDING',
  DizOngoing = 'DIZ_ONGOING',
  DizFinished = 'DIZ_FINISHED',
  DizRequested = 'DIZ_REQUESTED',

  // UAC
  UacPending = 'UAC_PENDING',
  UacOngoing = 'UAC_ONGOING',
  UacFinished = 'UAC_FINISHED',
  UacRequested = 'UAC_REQUESTED',

  // FDPG
  FdpgRequestedToCheck = 'FDPG_REQUESTED_TO_CHECK',
  FdpgRequestedInWork = 'FDPG_REQUESTED_IN_WORK',
  FdpgPendingToCheck = 'FDPG_PENDING_TO_CHECK',
  FdpgPendingInWork = 'FDPG_PENDING_IN_WORK',
  FdpgOngoingToCheck = 'FDPG_ONGOING_TO_CHECK',
  FdpgOngoingInWork = 'FDPG_ONGOING_IN_WORK',
  FdpgFinished = 'FDPG_FINISHED',

  // Register Proposals
  RegisterProposals = 'REGISTER_PROPOSALS',
}
