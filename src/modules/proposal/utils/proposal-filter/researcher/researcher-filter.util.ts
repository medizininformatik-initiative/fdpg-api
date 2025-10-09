import { ForbiddenException } from '@nestjs/common';
import { PanelQuery } from 'src/modules/proposal/enums/panel-query.enum';
import { ProposalStatus } from 'src/modules/proposal/enums/proposal-status.enum';
import { Proposal } from 'src/modules/proposal/schema/proposal.schema';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import { FilterQuery } from 'mongoose';
import { RESEARCHER_STATUS } from './researcher-filter.constants';
import { getRegisterProposalsForUser } from '../proposal-filter.util';

export const getFilterForResearcher = (panelQuery: PanelQuery, user: IRequestUser): FilterQuery<Proposal> => {
  const allowedQuery = [
    PanelQuery.Draft,
    PanelQuery.ResearcherPending,
    PanelQuery.ResearcherOngoing,
    PanelQuery.ResearcherFinished,
    PanelQuery.PublishedDraft,
    PanelQuery.PublishedPending,
    PanelQuery.PublishedCompleted,
    PanelQuery.Archived,
  ];

  if (allowedQuery.includes(panelQuery)) {
    // Special handling for Published page panels
    if (panelQuery === PanelQuery.PublishedDraft) {
      return getRegisterProposalsForUser(user, ProposalStatus.Draft);
    }

    if (panelQuery === PanelQuery.PublishedPending) {
      return getRegisterProposalsForUser(user, [
        ProposalStatus.Rework,
        ProposalStatus.FdpgCheck,
        ProposalStatus.ReadyToPublish,
      ]);
    }

    if (panelQuery === PanelQuery.PublishedCompleted) {
      return getRegisterProposalsForUser(user, [ProposalStatus.Published, ProposalStatus.Rejected]);
    }

    return {
      $or: [
        {
          ownerId: user.userId,
        },
        {
          participants: {
            $elemMatch: {
              'researcher.email': user.email,
            },
          },
        },
        {
          'projectResponsible.researcher.email': user.email,
        },
      ],
      status: RESEARCHER_STATUS[panelQuery],
    };
  } else {
    throw new ForbiddenException();
  }
};
