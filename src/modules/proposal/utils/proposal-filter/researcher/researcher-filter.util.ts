import { ForbiddenException } from '@nestjs/common';
import { PanelQuery } from 'src/modules/proposal/enums/panel-query.enum';
import { ProposalStatus } from 'src/modules/proposal/enums/proposal-status.enum';
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
    PanelQuery.RegisterDraftProposals,
    PanelQuery.RegisterSubmittedProposals,
    PanelQuery.Archived,
  ];

  if (allowedQuery.includes(panelQuery)) {
    // Special handling for Register proposals - filter by isRegister and status
    if (panelQuery === PanelQuery.RegisterDraftProposals) {
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
        isRegister: true,
        status: RESEARCHER_STATUS[PanelQuery.Draft],
      };
    }

    if (panelQuery === PanelQuery.RegisterSubmittedProposals) {
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
        isRegister: true,
        status: ProposalStatus.FdpgCheck,
      };
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
