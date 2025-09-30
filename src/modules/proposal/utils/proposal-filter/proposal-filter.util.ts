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

export const getProposalFilter = (
  panelQuery: PanelQuery,
  user: IRequestUser,
  isRegisterFilter?: boolean,
): FilterQuery<Proposal> => {
  let baseFilter: FilterQuery<Proposal>;

  switch (user.singleKnownRole) {
    case Role.Researcher:
      baseFilter = getFilterForResearcher(panelQuery, user);
      break;
    case Role.RegisteringMember:
      baseFilter = getFilterForResearcher(panelQuery, user);
      break;
    case Role.FdpgMember:
      baseFilter = getFilterForFdpg(panelQuery);
      break;
    case Role.DizMember:
      baseFilter = getFilterForDiz(panelQuery, user);
      break;
    case Role.UacMember:
      baseFilter = getFilterForUac(panelQuery, user);
      break;
    case Role.DataSourceMember:
      baseFilter = {
        ...getFilterForFdpg(panelQuery),
        selectedDataSources: { $in: user.assignedDataSources },
      };
      break;
    default:
      throw new ForbiddenException();
  }

  // Apply isRegister filter if specified
  if (isRegisterFilter !== undefined) {
    if (isRegisterFilter === true) {
      // For register proposals: explicitly isRegister = true
      baseFilter = {
        ...baseFilter,
        isRegister: true,
      };
    } else {
      // For non-register proposals: isRegister is not true (includes false, null, undefined, or missing field)
      baseFilter = {
        ...baseFilter,
        isRegister: { $ne: true },
      };
    }
  }

  return baseFilter;
};
