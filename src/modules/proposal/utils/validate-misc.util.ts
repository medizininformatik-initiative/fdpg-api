import { ForbiddenException } from '@nestjs/common';
import { ProposalStatus } from '../enums/proposal-status.enum';
import { Proposal } from '../schema/proposal.schema';

export const validateUpdateAdditionalInformationAccess = (proposal: Proposal) => {
  if (proposal.status !== ProposalStatus.LocationCheck) {
    throw new ForbiddenException('cannot update additional information outside of the location check step.');
  }
};
