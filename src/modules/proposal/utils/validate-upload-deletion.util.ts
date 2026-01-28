import { ForbiddenException } from '@nestjs/common';
import { Role } from 'src/shared/enums/role.enum';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import { ProposalStatus } from '../enums/proposal-status.enum';
import { DirectUpload, UploadType, UseCaseUpload } from '../enums/upload-type.enum';
import { ProposalDocument } from '../schema/proposal.schema';
import { Upload } from '../schema/sub-schema/upload.schema';
import { ParticipantRoleType } from '../enums/participant-role-type.enum';

const generalAccessTypes = [
  DirectUpload.EthicVote,
  DirectUpload.EthicVoteDeclarationOfNonResponsibility,
  DirectUpload.GeneralAppendix,
  DirectUpload.AdditionalDocument,
] as UploadType[];

export const validateUploadDeletion = (proposal: ProposalDocument, upload: Upload, user: IRequestUser) => {
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
  const isEditor = (proposal.participants || []).some(
    (participant) =>
      participant.researcher.email === user.email &&
      [ParticipantRoleType.Researcher, ParticipantRoleType.ResponsibleScientist].includes(
        participant.participantRole.role,
      ),
  );
  const hasEditRights = isOwner || isEditor;
  const isGeneralAccessType = generalAccessTypes.includes(upload.type);
  const isEditable = proposal.status === ProposalStatus.Draft || proposal.status === ProposalStatus.Rework;

  if (!hasEditRights || (!isGeneralAccessType && upload.type !== UseCaseUpload.FeasibilityQuery)) {
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
