import { ForbiddenException } from '@nestjs/common';
import { ProposalStatus } from '../enums/proposal-status.enum';
import { Proposal } from '../schema/proposal.schema';

export const validateFdpgChecklist = (proposal: Proposal) => {
  if (proposal.status !== ProposalStatus.FdpgCheck) {
    throw new ForbiddenException('The current status does not allow to set the fdpg checklist');
  }
};
