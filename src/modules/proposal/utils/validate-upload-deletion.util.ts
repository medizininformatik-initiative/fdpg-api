import { ForbiddenException } from '@nestjs/common';
import { Role } from 'src/shared/enums/role.enum';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import { ProposalStatus } from '../enums/proposal-status.enum';
import { DirectUpload, UploadType } from '../enums/upload-type.enum';
import { ProposalDocument } from '../schema/proposal.schema';
import { Upload } from '../schema/sub-schema/upload.schema';

const generalAccessTypes = [
  DirectUpload.EthicVote,
  DirectUpload.EthicVoteDeclarationOfNonResponsibility,
  DirectUpload.GeneralAppendix,
] as UploadType[];

export const validateUploadDeletion = (proposal: ProposalDocument, upload: Upload, user: IRequestUser) => {
  if (user.roles.includes(Role.Researcher)) {
    checkForResearcher(proposal, upload, user);
  }

  if (user.roles.includes(Role.FdpgMember)) {
    checkForFdpgMember(proposal);
  }

  if (user.roles.includes(Role.DizMember)) {
    checkForLocationMember(proposal, upload);
  }

  if (user.roles.includes(Role.UacMember)) {
    checkForLocationMember(proposal, upload);
  }
};

const checkForResearcher = (proposal: ProposalDocument, upload: Upload, user: IRequestUser) => {
  const isOwner = proposal.owner.id === user.userId;
  const isGeneralAccessType = generalAccessTypes.includes(upload.type);
  const isEditable = proposal.status === ProposalStatus.Draft || proposal.status === ProposalStatus.Rework;

  if (!isOwner || !isGeneralAccessType) {
    throwForbiddenError();
  }

  if (upload.type === DirectUpload.GeneralAppendix && !isEditable) {
    throwForbiddenError();
  }

  const isEthicSectionDone = proposal.userProject.ethicVote.isDone;
  if (
    (upload.type === DirectUpload.EthicVote || upload.type === DirectUpload.EthicVoteDeclarationOfNonResponsibility) &&
    !isEditable &&
    isEthicSectionDone
  ) {
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
