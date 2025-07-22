import { ForbiddenException } from '@nestjs/common';
import { ProposalStatus } from '../enums/proposal-status.enum';
import { Proposal } from '../schema/proposal.schema';
import { Role } from 'src/shared/enums/role.enum';
import { IRequestUser } from 'src/shared/types/request-user.interface';

export const validateUpdateAdditionalInformationAccess = (proposal: Proposal, user?: IRequestUser) => {
  // DIZ members can update in LocationCheck and Contracting
  if (user?.singleKnownRole === Role.DizMember) {
    if (proposal.status !== ProposalStatus.LocationCheck && proposal.status !== ProposalStatus.Contracting) {
      throw new ForbiddenException(
        'DIZ members can only update additional information during location check or contracting.',
      );
    }
    return;
  }
  if (proposal.status !== ProposalStatus.LocationCheck) {
    throw new ForbiddenException('cannot update additional information outside of the location check step.');
  }
};
