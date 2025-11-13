export enum PanelQuery {
  // General
  Archived = 'ARCHIVED',

  // Researcher
  Draft = 'DRAFT',
  ResearcherPending = 'RESEARCHER_PENDING',
  ResearcherOngoing = 'RESEARCHER_ONGOING',
  ResearcherFinished = 'RESEARCHER_FINISHED',

  // DIZ
  DizComingUp = 'DIZ_COMING_UP',
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

  // Published Page Panels
  PublishedDraft = 'PUBLISHED_DRAFT',
  PublishedPending = 'PUBLISHED_PENDING',
  PublishedCompleted = 'PUBLISHED_COMPLETED',

  // FDPG Published Page Panels
  FdpgPublishedRequested = 'FDPG_PUBLISHED_REQUESTED',
  FdpgPublishedReady = 'FDPG_PUBLISHED_READY',
  FdpgPublishedPublished = 'FDPG_PUBLISHED_PUBLISHED',
  FdpgPublishedDraft = 'FDPG_PUBLISHED_DRAFT',
  // DataManagementOffice
  DmsPending = 'DMS_PENDING',
  DmsApproved = 'DMS_APPROVED',
}
