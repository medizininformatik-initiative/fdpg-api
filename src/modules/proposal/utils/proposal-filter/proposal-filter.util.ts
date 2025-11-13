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
import { ProposalStatus } from '../../enums/proposal-status.enum';
import { ProposalType } from '../../enums/proposal-type.enum';
import { getFilterForDmo } from './dmo/dmo-filter.util';

export const getRegisterProposalsForUser = (
  user: IRequestUser,
  status: ProposalStatus | ProposalStatus[],
): FilterQuery<Proposal> => ({
  $or: [
    { ownerId: user.userId },
    { participants: { $elemMatch: { 'researcher.email': user.email } } },
    { 'projectResponsible.researcher.email': user.email },
  ],
  type: ProposalType.RegisteringForm,
  'registerInfo.isInternalRegistration': { $ne: true },
  'owner.role': { $ne: Role.FdpgMember },
  status: Array.isArray(status) ? { $in: status } : status,
});

export const getProposalFilter = (panelQuery: PanelQuery, user: IRequestUser): FilterQuery<Proposal> => {
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
    case Role.DataManagementOffice:
      baseFilter = getFilterForDmo(panelQuery, user);
      break;
    default:
      throw new ForbiddenException();
  }

  return baseFilter;
};
