import { IRequestUser } from 'src/shared/types/request-user.interface';
import { ProposalDocument } from '../../schema/proposal.schema';
import { ProposalStatus } from '../../enums/proposal-status.enum';
import { Role } from 'src/shared/enums/role.enum';
import { DirectUpload, UseCaseUpload } from '../../enums/upload-type.enum';
import { Upload } from '../../schema/sub-schema/upload.schema';
import { ForbiddenException } from '@nestjs/common';
import { validateUploadDeletion } from '../validate-upload-deletion.util';

describe('validateUploadDeletion', () => {
  let baseProposal: ProposalDocument;
  let researcherUser: IRequestUser;
  let otherResearcher: IRequestUser;
  let fdpgUser: IRequestUser;
  let dataSourceUser: IRequestUser;
  let dizUser: IRequestUser;
  let uacUser: IRequestUser;

  beforeEach(() => {
    baseProposal = {
      owner: { id: 'owner-1' },
      status: ProposalStatus.Draft,
      userProject: {
        ethicVote: { isDone: false },
      },
    } as unknown as ProposalDocument;

    researcherUser = {
      singleKnownRole: Role.Researcher,
      userId: 'owner-1',
      roles: [Role.Researcher],
    } as IRequestUser;

    otherResearcher = {
      singleKnownRole: Role.Researcher,
      userId: 'someone-else',
      roles: [Role.Researcher],
    } as IRequestUser;

    fdpgUser = {
      singleKnownRole: Role.FdpgMember,
      userId: 'fdpg-1',
      roles: [Role.FdpgMember],
    } as IRequestUser;

    dataSourceUser = {
      singleKnownRole: Role.DataSourceMember,
      userId: 'ds-1',
      roles: [Role.DataSourceMember],
    } as IRequestUser;

    dizUser = {
      singleKnownRole: Role.DizMember,
      userId: 'diz-1',
      roles: [Role.DizMember],
    } as IRequestUser;

    uacUser = {
      singleKnownRole: Role.UacMember,
      userId: 'uac-1',
      roles: [Role.UacMember],
    } as IRequestUser;
  });

  describe('Researcher branch', () => {
    it('throws if user is not owner, even for general access type', () => {
      const upload: Upload = { type: DirectUpload.GeneralAppendix } as Upload;
      expect(() => validateUploadDeletion(baseProposal, upload, otherResearcher)).toThrow(ForbiddenException);
    });

    it('throws if user is owner but upload.type is not a generalAccessType', () => {
      const upload: Upload = { type: UseCaseUpload.LocationContract } as Upload;
      expect(() => validateUploadDeletion(baseProposal, upload, researcherUser)).toThrow(ForbiddenException);
    });

    it('throws if upload.type is GeneralAppendix and status not editable', () => {
      baseProposal.status = ProposalStatus.Rejected; // not Draft or Rework
      const upload: Upload = { type: DirectUpload.GeneralAppendix } as Upload;
      expect(() => validateUploadDeletion(baseProposal, upload, researcherUser)).toThrow(ForbiddenException);
    });

    it('allows deletion of GeneralAppendix when status is Draft or Rework', () => {
      baseProposal.status = ProposalStatus.Draft;
      const upload: Upload = { type: DirectUpload.GeneralAppendix } as Upload;
      expect(() => validateUploadDeletion(baseProposal, upload, researcherUser)).not.toThrow();

      baseProposal.status = ProposalStatus.Rework;
      expect(() => validateUploadDeletion(baseProposal, upload, researcherUser)).not.toThrow();
    });

    it('allows EthicVote deletion when status is Draft or Rework regardless of isDone', () => {
      baseProposal.status = ProposalStatus.Draft;
      baseProposal.userProject.ethicVote.isDone = true;
      const upload: Upload = { type: DirectUpload.EthicVote } as Upload;
      expect(() => validateUploadDeletion(baseProposal, upload, researcherUser)).not.toThrow();

      baseProposal.status = ProposalStatus.Rework;
      expect(() => validateUploadDeletion(baseProposal, upload, researcherUser)).not.toThrow();
    });

    it('throws if EthicVote and status not editable and ethic section done', () => {
      baseProposal.status = ProposalStatus.Rejected;
      baseProposal.userProject.ethicVote.isDone = true;
      const upload: Upload = { type: DirectUpload.EthicVote } as Upload;
      expect(() => validateUploadDeletion(baseProposal, upload, researcherUser)).toThrow(ForbiddenException);
    });

    it('allows if EthicVote and status not editable but ethic section not done', () => {
      baseProposal.status = ProposalStatus.Rejected;
      baseProposal.userProject.ethicVote.isDone = false;
      const upload: Upload = { type: DirectUpload.EthicVote } as Upload;
      expect(() => validateUploadDeletion(baseProposal, upload, researcherUser)).not.toThrow();
    });

    it('throws if EthicVoteDeclarationOfNonResponsibility and status not editable and ethic section done', () => {
      baseProposal.status = ProposalStatus.Rejected;
      baseProposal.userProject.ethicVote.isDone = true;
      const upload: Upload = {
        type: DirectUpload.EthicVoteDeclarationOfNonResponsibility,
      } as Upload;
      expect(() => validateUploadDeletion(baseProposal, upload, researcherUser)).toThrow(ForbiddenException);
    });

    it('allows EthicVoteDeclarationOfNonResponsibility when status editable', () => {
      baseProposal.status = ProposalStatus.Rework;
      baseProposal.userProject.ethicVote.isDone = true;
      const upload: Upload = {
        type: DirectUpload.EthicVoteDeclarationOfNonResponsibility,
      } as Upload;
      expect(() => validateUploadDeletion(baseProposal, upload, researcherUser)).not.toThrow();
    });
  });

  describe('FdpgMember/DataSourceMember branch', () => {
    it('throws when status is Draft', () => {
      baseProposal.status = ProposalStatus.Draft;
      const upload: Upload = { type: DirectUpload.AdditionalDocument } as Upload;
      expect(() => validateUploadDeletion(baseProposal, upload, fdpgUser)).toThrow(ForbiddenException);
      expect(() => validateUploadDeletion(baseProposal, upload, dataSourceUser)).toThrow(ForbiddenException);
    });

    it('allows when status is not Draft', () => {
      baseProposal.status = ProposalStatus.Rework;
      const upload: Upload = { type: DirectUpload.AdditionalDocument } as Upload;
      expect(() => validateUploadDeletion(baseProposal, upload, fdpgUser)).not.toThrow();
      expect(() => validateUploadDeletion(baseProposal, upload, dataSourceUser)).not.toThrow();
    });
  });

  describe('DizMember/UacMember branch', () => {
    it('always throws for DizMember', () => {
      baseProposal.status = ProposalStatus.Rejected;
      const upload: Upload = { type: DirectUpload.GeneralAppendix } as Upload;
      expect(() => validateUploadDeletion(baseProposal, upload, dizUser)).toThrow(ForbiddenException);
    });

    it('always throws for UacMember', () => {
      baseProposal.status = ProposalStatus.Rejected;
      const upload: Upload = { type: DirectUpload.EthicVote } as Upload;
      expect(() => validateUploadDeletion(baseProposal, upload, uacUser)).toThrow(ForbiddenException);
    });
  });
});
