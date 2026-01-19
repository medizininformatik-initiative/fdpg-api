import { ForbiddenException } from '@nestjs/common';
import { ProposalStatus } from 'src/modules/proposal/enums/proposal-status.enum';
import { ProposalType } from 'src/modules/proposal/enums/proposal-type.enum';
import { ProposalDocument } from 'src/modules/proposal/schema/proposal.schema';
import { Role } from 'src/shared/enums/role.enum';
import { IRequestUser } from 'src/shared/types/request-user.interface';

export const validateProposalDeletion = (proposal: ProposalDocument, user: IRequestUser) => {
  const hasRegisteringMemberRole = user.roles.includes(Role.RegisteringMember);

  if (hasRegisteringMemberRole) {
    checkForRegisteringMember(proposal, user);
  } else if (user.singleKnownRole === Role.Researcher) {
    checkForResearcher(proposal, user);
  } else if (user.singleKnownRole === Role.FdpgMember || user.singleKnownRole === Role.DataSourceMember) {
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

const checkForRegisteringMember = (proposal: ProposalDocument, user: IRequestUser) => {
  if (proposal.type === ProposalType.RegisteringForm) {
    checkForResearcher(proposal, user);
  } else {
    throwForbiddenError();
  }
};

const checkForFdpgMember = (proposal: ProposalDocument) => {
  // Allow deletion of internal registrations at any status
  if (proposal.type === ProposalType.RegisteringForm && proposal.registerInfo?.isInternalRegistration) {
    return;
  }

  if (proposal.status === ProposalStatus.Draft) {
    throwForbiddenError();
  }
};

const throwForbiddenError = () => {
  throw new ForbiddenException();
};
