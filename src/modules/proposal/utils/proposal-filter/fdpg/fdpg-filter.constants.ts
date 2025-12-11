import { PanelQuery } from 'src/modules/proposal/enums/panel-query.enum';
import { ProposalStatus } from 'src/modules/proposal/enums/proposal-status.enum';
import { ProposalType } from 'src/modules/proposal/enums/proposal-type.enum';
import { SyncStatus } from 'src/modules/proposal/enums/sync-status.enum';
import { Role } from 'src/shared/enums/role.enum';
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

// FDPG Published page panels (for registering forms)
const FDPG_PUBLISHED_REQUESTED: FilterQuery<Proposal> = {
  type: ProposalType.RegisteringForm,
  status: ProposalStatus.FdpgCheck,
};
const FDPG_PUBLISHED_READY: FilterQuery<Proposal> = {
  type: ProposalType.RegisteringForm,
  status: ProposalStatus.Published,
  'registerInfo.syncStatus': {
    $in: [SyncStatus.OutOfSync, SyncStatus.SyncFailed, SyncStatus.Syncing, SyncStatus.NotSynced],
  },
};
const FDPG_PUBLISHED_PUBLISHED: FilterQuery<Proposal> = {
  type: ProposalType.RegisteringForm,
  status: ProposalStatus.Published,
  'registerInfo.syncStatus': SyncStatus.Synced,
};
const FDPG_PUBLISHED_DRAFT: FilterQuery<Proposal> = {
  type: ProposalType.RegisteringForm,
  status: ProposalStatus.Draft,
  $or: [{ 'registerInfo.isInternalRegistration': true }, { 'owner.role': Role.FdpgMember }],
};

export const FDPG_FILTER: Record<string, FilterQuery<Proposal>> = {
  [PanelQuery.FdpgRequestedToCheck]: REQUESTED_TO_CHECK,
  [PanelQuery.FdpgRequestedInWork]: REQUESTED_IN_WORK,
  [PanelQuery.FdpgPendingToCheck]: PENDING_TO_CHECK,
  [PanelQuery.FdpgPendingInWork]: PENDING_IN_WORK,
  [PanelQuery.FdpgOngoingToCheck]: ONGOING_TO_CHECK,
  [PanelQuery.FdpgOngoingInWork]: ONGOING_IN_WORK,
  [PanelQuery.FdpgFinished]: FINISHED,
  [PanelQuery.FdpgPublishedRequested]: FDPG_PUBLISHED_REQUESTED,
  [PanelQuery.FdpgPublishedReady]: FDPG_PUBLISHED_READY,
  [PanelQuery.FdpgPublishedPublished]: FDPG_PUBLISHED_PUBLISHED,
  [PanelQuery.FdpgPublishedDraft]: FDPG_PUBLISHED_DRAFT,
  [PanelQuery.Archived]: ARCHIVED,
};
