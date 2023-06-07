import { PanelQuery } from 'src/modules/proposal/enums/panel-query.enum';
import { ProposalStatus } from 'src/modules/proposal/enums/proposal-status.enum';

const DRAFT = ProposalStatus.Draft;
const ARCHIVED = ProposalStatus.Archived;
const ONGOING = [
  ProposalStatus.ExpectDataDelivery,
  ProposalStatus.DataResearch,
  ProposalStatus.FinishedProject,
  ProposalStatus.DataCorrupt,
];
const PENDING = [
  ProposalStatus.FdpgCheck,
  ProposalStatus.Rework,
  ProposalStatus.LocationCheck,
  ProposalStatus.Contracting,
];
const FINISHED = [ProposalStatus.Rejected, ProposalStatus.ReadyToArchive];

export const RESEARCHER_STATUS = {
  [PanelQuery.Draft]: DRAFT,
  [PanelQuery.Archived]: ARCHIVED,
  [PanelQuery.ResearcherOngoing]: { $in: ONGOING },
  [PanelQuery.ResearcherPending]: { $in: PENDING },
  [PanelQuery.ResearcherFinished]: { $in: FINISHED },
};
