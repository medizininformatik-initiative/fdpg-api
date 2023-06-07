import { ForbiddenException } from '@nestjs/common';
import { PanelQuery } from 'src/modules/proposal/enums/panel-query.enum';
import { Proposal } from 'src/modules/proposal/schema/proposal.schema';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import { FilterQuery } from 'mongoose';
import { RESEARCHER_STATUS } from './researcher-filter.constants';

export const getFilterForResearcher = (panelQuery: PanelQuery, user: IRequestUser): FilterQuery<Proposal> => {
  const allowedQuery = [
    PanelQuery.Draft,
    PanelQuery.ResearcherPending,
    PanelQuery.ResearcherOngoing,
    PanelQuery.ResearcherFinished,
    PanelQuery.Archived,
  ];

  if (allowedQuery.includes(panelQuery)) {
    return {
      ownerId: user.userId,
      status: RESEARCHER_STATUS[panelQuery],
    };
  } else {
    throw new ForbiddenException();
  }
};
