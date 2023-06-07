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

export const FDPG_FILTER: Record<string, FilterQuery<Proposal>> = {
  [PanelQuery.FdpgRequestedToCheck]: REQUESTED_TO_CHECK,
  [PanelQuery.FdpgRequestedInWork]: REQUESTED_IN_WORK,
  [PanelQuery.FdpgPendingToCheck]: PENDING_TO_CHECK,
  [PanelQuery.FdpgPendingInWork]: PENDING_IN_WORK,
  [PanelQuery.FdpgOngoingToCheck]: ONGOING_TO_CHECK,
  [PanelQuery.FdpgOngoingInWork]: ONGOING_IN_WORK,
  [PanelQuery.FdpgFinished]: FINISHED,
  [PanelQuery.Archived]: ARCHIVED,
};
