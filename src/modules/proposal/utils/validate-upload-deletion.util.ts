import { ForbiddenException } from '@nestjs/common';
import { Role } from 'src/shared/enums/role.enum';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import { ProposalStatus } from '../enums/proposal-status.enum';
import { DirectUpload, UploadType, UseCaseUpload } from '../enums/upload-type.enum';
import { ProposalDocument } from '../schema/proposal.schema';
import { Upload } from '../schema/sub-schema/upload.schema';
import { ProposalType } from '../enums/proposal-type.enum';

const generalAccessTypes = [
  DirectUpload.EthicVote,
  DirectUpload.EthicVoteDeclarationOfNonResponsibility,
  DirectUpload.GeneralAppendix,
  DirectUpload.AdditionalDocument,
  DirectUpload.ProjectLogo,
] as UploadType[];

export const validateUploadDeletion = (proposal: ProposalDocument, upload: Upload, user: IRequestUser) => {
  const hasRegisteringMemberRole = user.roles.includes(Role.RegisteringMember);

  if (hasRegisteringMemberRole) {
    checkForRegisteringMember(proposal, upload, user);
    return;
  }

  if (user.singleKnownRole === Role.Researcher) {
    checkForResearcher(proposal, upload, user);
  }

  if (user.singleKnownRole === Role.FdpgMember || user.singleKnownRole === Role.DataSourceMember) {
    checkForFdpgMember(proposal);
  }

  if (user.singleKnownRole === Role.DizMember) {
    checkForLocationMember(proposal, upload);
  }

  if (user.singleKnownRole === Role.UacMember) {
    checkForLocationMember(proposal, upload);
  }
};

const checkForResearcher = (proposal: ProposalDocument, upload: Upload, user: IRequestUser) => {
  const isOwner = proposal.owner.id === user.userId;
  const isGeneralAccessType = generalAccessTypes.includes(upload.type);
  const isEditable = proposal.status === ProposalStatus.Draft || proposal.status === ProposalStatus.Rework;

  if ((!isOwner || !isGeneralAccessType) && upload.type !== UseCaseUpload.FeasibilityQuery) {
    throwForbiddenError();
  }

  if (
    upload.type === UseCaseUpload.FeasibilityQuery &&
    ![ProposalStatus.Draft, ProposalStatus.Rework].includes(proposal.status)
  ) {
    throwForbiddenError();
  }

  if (upload.type === DirectUpload.GeneralAppendix && !isEditable) {
    throwForbiddenError();
  }

  const isEthicSectionDone = proposal.userProject?.ethicVote?.isDone;
  if (
    (upload.type === DirectUpload.EthicVote || upload.type === DirectUpload.EthicVoteDeclarationOfNonResponsibility) &&
    !isEditable &&
    isEthicSectionDone
  ) {
    throwForbiddenError();
  }
};

const checkForRegisteringMember = (proposal: ProposalDocument, upload: Upload, user: IRequestUser) => {
  if (proposal.type === ProposalType.RegisteringForm) {
    checkForResearcher(proposal, upload, user);
  } else {
    throwForbiddenError();
  }
};

const checkForFdpgMember = (proposal: ProposalDocument) => {
  if (proposal.status === ProposalStatus.Draft) {
    throwForbiddenError();
  }
};

const checkForLocationMember = (_proposal: ProposalDocument, _upload: Upload) => {
  throwForbiddenError();
};

const throwForbiddenError = () => {
  throw new ForbiddenException();
};
