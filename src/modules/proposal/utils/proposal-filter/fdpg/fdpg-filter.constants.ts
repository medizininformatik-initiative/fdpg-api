import { PanelQuery } from 'src/modules/proposal/enums/panel-query.enum';
import { ProposalStatus } from 'src/modules/proposal/enums/proposal-status.enum';
import { ProposalType } from 'src/modules/proposal/enums/proposal-type.enum';
import { SyncStatus } from 'src/modules/proposal/enums/sync-status.enum';
import { FilterQuery } from 'mongoose';
import { Proposal } from 'src/modules/proposal/schema/proposal.schema';

const REQUESTED_TO_CHECK: FilterQuery<Proposal> = {
  status: ProposalStatus.FdpgCheck,
  type: ProposalType.ApplicationForm,
};

const REQUESTED_IN_WORK = { status: ProposalStatus.Rework, type: ProposalType.ApplicationForm };

const PENDING_TO_CHECK = {
  status: { $in: [ProposalStatus.LocationCheck, ProposalStatus.Contracting] },
  openFdpgTasksCount: { $gt: 0 },
  type: ProposalType.ApplicationForm,
};

const PENDING_IN_WORK = {
  status: { $in: [ProposalStatus.LocationCheck, ProposalStatus.Contracting] },
  openFdpgTasksCount: 0,
  type: ProposalType.ApplicationForm,
};

const ONGOING_TO_CHECK = {
  status: { $in: [ProposalStatus.FinishedProject, ProposalStatus.DataCorrupt] },
  type: ProposalType.ApplicationForm,
};
const ONGOING_IN_WORK = {
  status: { $in: [ProposalStatus.ExpectDataDelivery, ProposalStatus.DataResearch] },
  type: ProposalType.ApplicationForm,
};
const FINISHED = {
  status: { $in: [ProposalStatus.Rejected, ProposalStatus.ReadyToArchive] },
  type: ProposalType.ApplicationForm,
};
const ARCHIVED = { status: ProposalStatus.Archived };

// Published page panels (for non-FDPG users - exclude internal registrations)
const PUBLISHED_DRAFT = {
  type: ProposalType.RegisteringForm,
  'registerInfo.isInternalRegistration': { $ne: true },
  status: ProposalStatus.Draft,
};
const PUBLISHED_PENDING = {
  type: ProposalType.RegisteringForm,
  'registerInfo.isInternalRegistration': { $ne: true },
  status: { $in: [ProposalStatus.Rework, ProposalStatus.FdpgCheck] },
};
const PUBLISHED_COMPLETED = {
  type: ProposalType.RegisteringForm,
  'registerInfo.isInternalRegistration': { $ne: true },
  status: { $in: [ProposalStatus.Published, ProposalStatus.Rejected] },
};

// FDPG Published page panels
const FDPG_PUBLISHED_REQUESTED = { type: ProposalType.RegisteringForm, status: ProposalStatus.FdpgCheck };
const FDPG_PUBLISHED_READY: FilterQuery<Proposal> = {
  type: ProposalType.RegisteringForm,
  status: ProposalStatus.Published,
  'registerInfo.syncStatus': {
    $in: [SyncStatus.OutOfSync, SyncStatus.SyncFailed, SyncStatus.Syncing, SyncStatus.NotSynced],
  },
};
const FDPG_PUBLISHED_PUBLISHED = {
  type: ProposalType.RegisteringForm,
  status: ProposalStatus.Published,
  'registerInfo.syncStatus': SyncStatus.Synced,
};
const FDPG_PUBLISHED_DRAFT = {
  type: ProposalType.RegisteringForm,
  'registerInfo.isInternalRegistration': true,
  status: ProposalStatus.Draft,
};

export const FDPG_FILTER: Record<string, FilterQuery<Proposal>> = {
  [PanelQuery.FdpgRequestedToCheck]: REQUESTED_TO_CHECK,
  [PanelQuery.FdpgRequestedInWork]: REQUESTED_IN_WORK,
  [PanelQuery.FdpgPendingToCheck]: PENDING_TO_CHECK,
  [PanelQuery.FdpgPendingInWork]: PENDING_IN_WORK,
  [PanelQuery.FdpgOngoingToCheck]: ONGOING_TO_CHECK,
  [PanelQuery.FdpgOngoingInWork]: ONGOING_IN_WORK,
  [PanelQuery.FdpgFinished]: FINISHED,

  [PanelQuery.PublishedDraft]: PUBLISHED_DRAFT,
  [PanelQuery.PublishedPending]: PUBLISHED_PENDING,
  [PanelQuery.PublishedCompleted]: PUBLISHED_COMPLETED,
  [PanelQuery.FdpgPublishedRequested]: FDPG_PUBLISHED_REQUESTED,
  [PanelQuery.FdpgPublishedReady]: FDPG_PUBLISHED_READY,
  [PanelQuery.FdpgPublishedPublished]: FDPG_PUBLISHED_PUBLISHED,
  [PanelQuery.FdpgPublishedDraft]: FDPG_PUBLISHED_DRAFT,
  [PanelQuery.Archived]: ARCHIVED,
};
