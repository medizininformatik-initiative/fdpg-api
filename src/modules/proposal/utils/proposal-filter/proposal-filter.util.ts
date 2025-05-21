import { ForbiddenException } from '@nestjs/common';
import { Role } from 'src/shared/enums/role.enum';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import { PanelQuery } from '../../enums/panel-query.enum';
import { Proposal } from '../../schema/proposal.schema';
import { FilterQuery } from 'mongoose';
import { getFilterForResearcher } from './researcher/researcher-filter.util';
import { getFilterForFdpg } from './fdpg/fdpg-filter.util';
import { getFilterForDiz } from './diz/diz-filter.util';
import { getFilterForUac } from './uac/uac-filter.util';

export const getProposalFilter = (panelQuery: PanelQuery, user: IRequestUser): FilterQuery<Proposal> => {
  switch (user.singleKnownRole) {
    case Role.Researcher:
      return getFilterForResearcher(panelQuery, user);
    case Role.FdpgMember:
      return getFilterForFdpg(panelQuery);
    case Role.DizMember:
      return getFilterForDiz(panelQuery, user);
    case Role.UacMember:
      return getFilterForUac(panelQuery, user);
    case Role.DataSourceMember:
      return {
        ...getFilterForFdpg(panelQuery),
        selectedDataSources: { $in: user.assignedDataSources },
      };

    default:
      throw new ForbiddenException();
  }
};
