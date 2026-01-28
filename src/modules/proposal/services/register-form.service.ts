import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Proposal, ProposalDocument } from '../schema/proposal.schema';
import { Model } from 'mongoose';
import { ProposalType } from '../enums/proposal-type.enum';
import { ReportCreateDto, ReportDto } from '../dto/proposal/report.dto';
import { PublicationCreateDto, PublicationUpdateDto } from '../dto/proposal/publication.dto';
import { PublicStorageService } from 'src/modules/storage';
import { ProposalCrudService } from './proposal-crud.service';
import { addReport, addReportUpload, getBlobName } from '../utils/proposal.utils';
import { UseCaseUpload } from '../enums/upload-type.enum';
import { UploadDto, UploadGetDto } from '../dto/upload.dto';
import { ModificationContext } from '../enums/modification-context.enum';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import { SyncStatus } from '../enums/sync-status.enum';

@Injectable()
export class RegisterFormService {
  private readonly logger = new Logger(RegisterFormService.name);

  constructor(
    @InjectModel(Proposal.name)
    private readonly proposalModel: Model<ProposalDocument>,
    private readonly publicStorageService: PublicStorageService,
    private readonly proposalCrudService: ProposalCrudService,
  ) {}

  private checkProposalType(proposal: Proposal): boolean {
    return proposal.type === ProposalType.ApplicationForm && !!proposal.registerFormId;
  }

  private async setRegistrationOutOfSync(registrationId: string): Promise<void> {
    try {
      this.logger.log(`Updating registering form ${registrationId} to OutOfSync`);
      await this.proposalModel.updateOne(
        { _id: registrationId },
        {
          $set: {
            'registerInfo.syncStatus': SyncStatus.OutOfSync,
          },
        },
      );
    } catch (error) {
      this.logger.error(`Failed to update registering form for ${registrationId}: ${error.message}`);
    }
  }

  private async getRegistration(
    proposal: Proposal,
    user: IRequestUser,
    modificationContext: ModificationContext,
  ): Promise<ProposalDocument> {
    if (!this.checkProposalType(proposal)) {
      throw new Error('Proposal is not of type ApplicationForm or has no registerFormId');
    }

    const projection = { projectAbbreviation: 1, reports: 1, publications: 1, owner: 1 };
    const registration = await this.proposalCrudService.findDocument(
      proposal.registerFormId,
      user,
      projection,
      true,
      modificationContext,
    );
    return registration;
  }

  async handleReportCreate(
    proposal: Proposal,
    reportCreateDto: ReportCreateDto,
    files: Express.Multer.File[],
    user: IRequestUser,
  ): Promise<void> {
    if (!this.checkProposalType(proposal)) {
      return;
    }

    const registration = await this.getRegistration(proposal, user, ModificationContext.Report);

    const report = new ReportDto(reportCreateDto);
    const uploadTasks = files.map(async (file) => {
      const uploadType = UseCaseUpload.ReportUpload;
      const blobName = getBlobName(proposal._id, uploadType, report._id);
      await this.publicStorageService.uploadFile(blobName, file);
      const upload = new UploadDto(blobName, file, uploadType, user);
      return upload;
    });

    const taskResults = await Promise.allSettled(uploadTasks);
    taskResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        addReportUpload(report, result.value);
      }
    });

    addReport(registration, report);

    await registration.save();

    const downloadTasks: Promise<void>[] = [];

    report.uploads.forEach((upload) => {
      const task = async () => {
        const downloadUrl = await this.publicStorageService.getPublicUrl(upload.blobName);
        (upload as UploadGetDto).downloadUrl = downloadUrl;
      };
      downloadTasks.push(task());
    });

    await Promise.allSettled([...downloadTasks]);
    await this.setRegistrationOutOfSync(registration._id);
  }

  async handlePublicationCreate(
    proposal: Proposal,
    publication: PublicationCreateDto,
    user: IRequestUser,
  ): Promise<void> {
    if (!this.checkProposalType(proposal)) {
      return;
    }
    const registration = await this.getRegistration(proposal, user, ModificationContext.Publication);
  }

  async handlePublicationUpdate(
    proposal: Proposal,
    publication: PublicationUpdateDto,
    user: IRequestUser,
  ): Promise<void> {
    if (!this.checkProposalType(proposal)) {
      return;
    }

    const registration = await this.getRegistration(proposal, user, ModificationContext.Publication);
  }
}
