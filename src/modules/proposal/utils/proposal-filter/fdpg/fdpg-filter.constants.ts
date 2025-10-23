import { PanelQuery } from 'src/modules/proposal/enums/panel-query.enum';
import { ProposalStatus } from 'src/modules/proposal/enums/proposal-status.enum';
import { FilterQuery } from 'mongoose';
import { Proposal } from 'src/modules/proposal/schema/proposal.schema';

const REQUESTED_TO_CHECK: FilterQuery<Proposal> = { status: ProposalStatus.FdpgCheck };

const REQUESTED_IN_WORK = { status: ProposalStatus.Rework };

const PENDING_TO_CHECK = {
  status: { $in: [ProposalStatus.LocationCheck, ProposalStatus.Contracting] },
  openFdpgTasksCount: { $gt: 0 },
};

const PENDING_IN_WORK = {
  status: { $in: [ProposalStatus.LocationCheck, ProposalStatus.Contracting] },
  openFdpgTasksCount: 0,
};

const ONGOING_TO_CHECK = { status: { $in: [ProposalStatus.FinishedProject, ProposalStatus.DataCorrupt] } };
const ONGOING_IN_WORK = { status: { $in: [ProposalStatus.ExpectDataDelivery, ProposalStatus.DataResearch] } };
const FINISHED = { status: { $in: [ProposalStatus.Rejected, ProposalStatus.ReadyToArchive] } };
const ARCHIVED = { status: ProposalStatus.Archived };

// Register proposals
const REGISTER_DRAFT_PROPOSALS = { isRegisteringForm: true, status: ProposalStatus.Draft };
const REGISTER_SUBMITTED_PROPOSALS = { isRegisteringForm: true, status: ProposalStatus.FdpgCheck };

// Published page panels
const PUBLISHED_DRAFT = { isRegisteringForm: true, status: ProposalStatus.Draft };
const PUBLISHED_PENDING = {
  isRegisteringForm: true,
  status: { $in: [ProposalStatus.Rework, ProposalStatus.FdpgCheck, ProposalStatus.ReadyToPublish] },
};
const PUBLISHED_COMPLETED = {
  isRegisteringForm: true,
  status: { $in: [ProposalStatus.Published, ProposalStatus.Rejected] },
};

// FDPG Published page panels
const FDPG_PUBLISHED_REQUESTED = { isRegisteringForm: true, status: ProposalStatus.FdpgCheck };
const FDPG_PUBLISHED_READY = { isRegisteringForm: true, status: ProposalStatus.ReadyToPublish };
const FDPG_PUBLISHED_PUBLISHED = { isRegisteringForm: true, status: ProposalStatus.Published };

export const FDPG_FILTER: Record<string, FilterQuery<Proposal>> = {
  [PanelQuery.FdpgRequestedToCheck]: REQUESTED_TO_CHECK,
  [PanelQuery.FdpgRequestedInWork]: REQUESTED_IN_WORK,
  [PanelQuery.FdpgPendingToCheck]: PENDING_TO_CHECK,
  [PanelQuery.FdpgPendingInWork]: PENDING_IN_WORK,
  [PanelQuery.FdpgOngoingToCheck]: ONGOING_TO_CHECK,
  [PanelQuery.FdpgOngoingInWork]: ONGOING_IN_WORK,
  [PanelQuery.FdpgFinished]: FINISHED,

  [PanelQuery.RegisterDraftProposals]: REGISTER_DRAFT_PROPOSALS,
  [PanelQuery.RegisterSubmittedProposals]: REGISTER_SUBMITTED_PROPOSALS,

  [PanelQuery.PublishedDraft]: PUBLISHED_DRAFT,
  [PanelQuery.PublishedPending]: PUBLISHED_PENDING,
  [PanelQuery.PublishedCompleted]: PUBLISHED_COMPLETED,
  [PanelQuery.FdpgPublishedRequested]: FDPG_PUBLISHED_REQUESTED,
  [PanelQuery.FdpgPublishedReady]: FDPG_PUBLISHED_READY,
  [PanelQuery.FdpgPublishedPublished]: FDPG_PUBLISHED_PUBLISHED,
  [PanelQuery.Archived]: ARCHIVED,
};
