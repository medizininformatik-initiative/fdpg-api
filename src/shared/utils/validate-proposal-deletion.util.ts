import { ForbiddenException } from '@nestjs/common';
import { ProposalStatus } from 'src/modules/proposal/enums/proposal-status.enum';
import { ProposalDocument } from 'src/modules/proposal/schema/proposal.schema';
import { Role } from 'src/shared/enums/role.enum';
import { IRequestUser } from 'src/shared/types/request-user.interface';

export const validateProposalDeletion = (proposal: ProposalDocument, user: IRequestUser) => {
  if (user.singleKnownRole === Role.Researcher) {
    checkForResearcher(proposal, user);
  } else if (user.singleKnownRole === Role.FdpgMember) {
    checkForFdpgMember(proposal);
  } else {
    throwForbiddenError();
  }
};

const checkForResearcher = (proposal: ProposalDocument, user: IRequestUser) => {
  const isOwner = proposal.owner.id === user.userId;
  const isDraft = proposal.status === ProposalStatus.Draft;
  if (!isOwner || !isDraft) {
    throwForbiddenError();
  }
};

const checkForFdpgMember = (proposal: ProposalDocument) => {
  if (proposal.status === ProposalStatus.Draft) {
    throwForbiddenError();
  }
};

const throwForbiddenError = () => {
  throw new ForbiddenException();
};
