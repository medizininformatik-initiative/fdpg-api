import { ForbiddenException } from '@nestjs/common';
import { ProposalStatus } from '../enums/proposal-status.enum';
import { Proposal } from '../schema/proposal.schema';

export const validateFdpgCheckStatus = (proposal: Proposal) => {
  if (proposal.status !== ProposalStatus.FdpgCheck) {
    throw new ForbiddenException(`Proposal must be in status ${ProposalStatus.FdpgCheck} to update the property`);
  }
};
