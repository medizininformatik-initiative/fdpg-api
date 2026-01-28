import { Injectable, Logger } from '@nestjs/common';
import { Proposal } from '../schema/proposal.schema';
import { ReportCreateDto, ReportDto, ReportUpdateDto } from '../dto/proposal/report.dto';
import { PublicStorageService } from 'src/modules/storage';
import { addReport, addReportUpload, getBlobName } from '../utils/proposal.utils';
import { UseCaseUpload } from '../enums/upload-type.enum';
import { UploadDto, UploadGetDto } from '../dto/upload.dto';
import { ModificationContext } from '../enums/modification-context.enum';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import { RegistrationFormCrudService } from './registration-form-crud.service';
import { ReportDocument } from '../schema/sub-schema/report.schema';
import { Upload } from '../schema/sub-schema/upload.schema';
import { removeInPlaceAndReturnRemoved } from 'src/shared/utils/array.utils';

@Injectable()
export class RegistrationFormReportService {
  private readonly logger = new Logger(RegistrationFormReportService.name);

  constructor(
    private readonly publicStorageService: PublicStorageService,
    private readonly registrationFormCrudService: RegistrationFormCrudService,
  ) {}

  async handleReportCreate(
    proposal: Proposal,
    reportCreateDto: ReportCreateDto,
    files: Express.Multer.File[],
    user: IRequestUser,
  ): Promise<void> {
    if (!this.registrationFormCrudService.checkProposalType(proposal)) {
      return;
    }

    const registration = await this.registrationFormCrudService.getRegistration(
      proposal,
      user,
      ModificationContext.Report,
    );
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
    await this.registrationFormCrudService.setRegistrationOutOfSync(registration._id);
  }

  async handleReportUpdate(
    proposal: Proposal,
    reportId: string,
    reportUpdateDto: ReportUpdateDto,
    files: Express.Multer.File[],
    user: IRequestUser,
  ): Promise<void> {
    if (!this.registrationFormCrudService.checkProposalType(proposal)) {
      return;
    }

    this.logger.log(
      `Syncing report update (${reportId}) from proposal ${proposal.projectAbbreviation} to registration`,
    );

    const registration = await this.registrationFormCrudService.getRegistration(
      proposal,
      user,
      ModificationContext.Report,
    );

    const reportIdx = registration.reports.findIndex((report: ReportDocument) => report._id.toString() === reportId);

    if (reportIdx === -1) {
      this.logger.warn(
        `Report ${reportId} not found in registration ${registration.projectAbbreviation} for update sync`,
      );
      return;
    }

    const { keepUploads, ...updateDto } = reportUpdateDto;

    // Remove uploads that are not in keepUploads
    const conditionToRemove = (upload: Upload) => !keepUploads.includes(upload._id.toString());
    const removedUploads = removeInPlaceAndReturnRemoved(registration.reports[reportIdx].uploads, conditionToRemove);

    if (removedUploads.length > 0) {
      await this.publicStorageService.deleteManyBlobs(removedUploads.map((upload) => upload.blobName));
    }

    // Add new uploads
    const uploadTasks = files.map(async (file) => {
      const uploadType = UseCaseUpload.ReportUpload;
      const blobName = getBlobName(proposal._id, uploadType, reportId);
      await this.publicStorageService.uploadFile(blobName, file);
      const upload = new UploadDto(blobName, file, uploadType, user);
      return upload;
    });

    const taskResults = await Promise.allSettled(uploadTasks);
    taskResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        registration.reports[reportIdx].uploads.push(result.value);
      }
    });

    // Update report content
    registration.reports[reportIdx] = {
      ...registration.reports[reportIdx],
      ...updateDto,
      _id: reportId,
      updatedAt: new Date(),
    };

    await registration.save();

    const downloadTasks: Promise<void>[] = [];
    registration.reports[reportIdx].uploads.forEach((upload) => {
      const task = async () => {
        const downloadUrl = await this.publicStorageService.getPublicUrl(upload.blobName);
        (upload as UploadGetDto).downloadUrl = downloadUrl;
      };
      downloadTasks.push(task());
    });

    await Promise.allSettled(downloadTasks);

    this.logger.log(
      `Successfully synced report update '${updateDto.title}' (${reportId}) to registration ${registration.projectAbbreviation}`,
    );
    await this.registrationFormCrudService.setRegistrationOutOfSync(registration._id);
  }

  async handleReportDelete(proposal: Proposal, reportId: string, user: IRequestUser): Promise<void> {
    if (!this.registrationFormCrudService.checkProposalType(proposal)) {
      return;
    }

    this.logger.log(
      `Syncing report delete (${reportId}) from proposal ${proposal.projectAbbreviation} to registration`,
    );

    const registration = await this.registrationFormCrudService.getRegistration(
      proposal,
      user,
      ModificationContext.Report,
    );

    const reportIdx = registration.reports.findIndex((report: ReportDocument) => report._id.toString() === reportId);

    if (reportIdx === -1) {
      this.logger.warn(
        `Report ${reportId} not found in registration ${registration.projectAbbreviation} for delete sync`,
      );
      return;
    }

    if (registration.reports[reportIdx].uploads.length > 0) {
      await this.publicStorageService.deleteManyBlobs(
        registration.reports[reportIdx].uploads.map((upload) => upload.blobName),
      );
    }

    registration.reports.splice(reportIdx, 1);
    await registration.save();

    this.logger.log(`Successfully deleted report (${reportId}) from registration ${registration.projectAbbreviation}`);
    await this.registrationFormCrudService.setRegistrationOutOfSync(registration._id);
  }
}
