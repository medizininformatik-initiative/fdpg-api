import { ForbiddenException } from '@nestjs/common';
import { FilterQuery } from 'mongoose';
import { PanelQuery } from 'src/modules/proposal/enums/panel-query.enum';
import { Proposal } from 'src/modules/proposal/schema/proposal.schema';
import { FDPG_FILTER } from './fdpg-filter.constants';

export const getFilterForFdpg = (panelQuery: PanelQuery): FilterQuery<Proposal> => {
  const allowedQuery = [
    PanelQuery.FdpgRequestedToCheck,
    PanelQuery.FdpgRequestedInWork,
    PanelQuery.FdpgPendingToCheck,
    PanelQuery.FdpgPendingInWork,
    PanelQuery.FdpgOngoingToCheck,
    PanelQuery.FdpgOngoingInWork,
    PanelQuery.FdpgFinished,
    PanelQuery.RegisterDraftProposals,
    PanelQuery.RegisterSubmittedProposals,
    PanelQuery.Archived,
  ];

  if (allowedQuery.includes(panelQuery)) {
    return FDPG_FILTER[panelQuery];
  } else {
    throw new ForbiddenException();
  }
};
