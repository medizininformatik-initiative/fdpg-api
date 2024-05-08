import { Injectable, NotFoundException } from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import { StorageService } from '../../storage/storage.service';
import { UploadDto, UploadGetDto } from '../dto/upload.dto';
import { DirectUpload } from '../enums/upload-type.enum';
import { ProposalCrudService } from './proposal-crud.service';
import { Proposal, ProposalDocument } from '../schema/proposal.schema';
import { addUpload, getBlobName } from '../utils/proposal.utils';
import { validateUploadDeletion } from '../utils/validate-upload-deletion.util';

@Injectable()
export class ProposalUploadService {
  constructor(private proposalCrudService: ProposalCrudService, private storageService: StorageService) {}

  async upload(
    proposalId: string,
    file: Express.Multer.File,
    type: DirectUpload,
    user: IRequestUser,
  ): Promise<UploadGetDto> {
    const proposal = await this.proposalCrudService.findDocument(proposalId, user, undefined, true);

    const blobName = getBlobName(proposal._id, type);
    await this.storageService.uploadFile(blobName, file, user);
    const upload = new UploadDto(blobName, file, type, user);

    addUpload(proposal, upload);

    const saveResult = await proposal.save();
    const uploadResult = JSON.parse(JSON.stringify(saveResult.uploads.at(-1)));
    return plainToClass(UploadGetDto, uploadResult, { strategy: 'excludeAll' });
  }

  async getDownloadUrl(proposalId: string, uploadId: string, user: IRequestUser): Promise<string> {
    const uploadProjection: Partial<Record<NestedPath<Proposal>, number>> = {
      uploads: 1,
      // Needed for access control:
      openDizChecks: 1,
      dizApprovedLocations: 1,
      uacApprovedLocations: 1,
      conditionalApprovals: 1,
      signedContracts: 1,
      requestedButExcludedLocations: 1,
      contractAcceptedByResearcher: 1,
      contractRejectedByResearcher: 1,
      status: 1,
    };
    const partialProposal = await this.proposalCrudService.findDocument(proposalId, user, uploadProjection);
    const upload = partialProposal.uploads.find((upload) => upload._id.toString() === uploadId);

    if (upload?.blobName) {
      return await this.storageService.getSasUrl(upload.blobName);
    } else {
      throw new NotFoundException('Upload does not exist');
    }
  }

  async deleteUpload(proposal: ProposalDocument, uploadId: string, user: IRequestUser): Promise<void> {
    const uploadIndex = proposal.uploads.findIndex((upload) => upload._id.toString() === uploadId);

    if (uploadIndex === -1) {
      return;
    }

    const upload = proposal.uploads[uploadIndex];

    validateUploadDeletion(proposal, upload, user);

    await this.storageService.deleteBlob(upload.blobName);

    proposal.uploads.splice(uploadIndex, 1);
  }

  async saveDeletedUpload(proposalId: string, uploadId: string, user: IRequestUser): Promise<void> {
    const proposal = await this.proposalCrudService.findDocument(proposalId, user, undefined, true);

    await this.deleteUpload(proposal, uploadId, user);

    try {
      await proposal.save();
    } catch (error) {
      throw new Error(error);
    }
  }
}
