import { Injectable, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import { removeInPlaceAndReturnRemoved } from 'src/shared/utils/array.utils';
import { StorageService } from '../../storage/storage.service';
import { EventEngineService } from '../../event-engine/event-engine.service';
import { ReportCreateDto, ReportDto, ReportGetDto, ReportUpdateDto } from '../dto/proposal/report.dto';
import { UploadDto, UploadGetDto } from '../dto/upload.dto';
import { ModificationContext } from '../enums/modification-context.enum';
import { UseCaseUpload } from '../enums/upload-type.enum';
import { ProposalCrudService } from './proposal-crud.service';
import { ReportDocument } from '../schema/sub-schema/report.schema';
import { Upload } from '../schema/sub-schema/upload.schema';
import { addReport, addReportUpload, getBlobName } from '../utils/proposal.utils';
import { validateReportUploads } from '../utils/validate-report.util';
import { RegistrationFormReportService } from './registration-form-report.service';
import { ProposalType } from '../enums/proposal-type.enum';
import { PublicStorageService } from 'src/modules/storage';

@Injectable()
export class ProposalReportService {
  constructor(
    private proposalCrudService: ProposalCrudService,
    private eventEngineService: EventEngineService,
    private storageService: StorageService,
    private publicStorageService: PublicStorageService,
    private registrationFormReportService: RegistrationFormReportService,
  ) {}

  private readonly projection = {
    projectAbbreviation: 1,
    reports: 1,
    owner: 1,
    type: 1,
    registerFormId: 1,
    registerInfo: 1,
  };

  async createReport(
    proposalId: string,
    reportCreateDto: ReportCreateDto,
    files: Express.Multer.File[],
    user: IRequestUser,
  ): Promise<ReportGetDto> {
    const proposal = await this.proposalCrudService.findDocument(
      proposalId,
      user,
      this.projection,
      true,
      ModificationContext.Report,
    );

    if (proposal.type === ProposalType.RegisteringForm) {
      return await this.registrationFormReportService.handleReportCreate(proposal, reportCreateDto, files, user);
    }

    const report = new ReportDto(reportCreateDto);
    const uploadTasks = files.map(async (file) => {
      const uploadType = UseCaseUpload.ReportUpload;
      const blobName = getBlobName(proposal._id, uploadType, report._id);
      await this.storageService.uploadFile(blobName, file, user);
      const upload = new UploadDto(blobName, file, uploadType, user);
      return upload;
    });

    const taskResults = await Promise.allSettled(uploadTasks);
    taskResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        addReportUpload(report, result.value);
      }
    });

    addReport(proposal, report);
    this.registrationFormReportService.setRegistrationOutOfSync(proposal);
    await proposal.save();

    const downloadTasks: Promise<void>[] = [];

    report.uploads.forEach((upload) => {
      const task = async () => {
        const downloadUrl = await this.storageService.getSasUrl(upload.blobName, true);
        (upload as UploadGetDto).downloadUrl = downloadUrl;
      };
      downloadTasks.push(task());
    });

    const sendNotifications = this.eventEngineService.handleProposalReportCreate(proposal, report);
    const syncRegistration = this.registrationFormReportService.handleReportCreate(proposal, report, files, user);
    await Promise.allSettled([...downloadTasks, sendNotifications, syncRegistration]);

    const plain = structuredClone(report);
    return plainToInstance(ReportGetDto, plain, { strategy: 'excludeAll' });
  }

  async getAllReports(proposalId: string, user: IRequestUser): Promise<ReportGetDto[]> {
    const projection = {
      type: 1,
      'reports._id': 1,
      'reports.uploads': 1,
      'reports.title': 1,
      'reports.createdAt': 1,
      'reports.updatedAt': 1,
      registerInfo: 1,
    };
    const proposal = await this.proposalCrudService.findDocument(proposalId, user, projection, false);

    const tasks: Promise<void>[] = [];
    proposal.reports.forEach((report) => {
      report.uploads.forEach((upload) => {
        const task = async () => {
          let downloadUrl: string;

          if (proposal.type === ProposalType.RegisteringForm) {
            downloadUrl = await this.publicStorageService.getPublicUrl(upload.blobName);
          } else {
            downloadUrl = await this.storageService.getSasUrl(upload.blobName, true);
          }

          (upload as UploadGetDto).downloadUrl = downloadUrl;
        };
        tasks.push(task());
      });
    });

    await Promise.allSettled(tasks);
    return plainToInstance(ReportGetDto, proposal.reports ?? [], { strategy: 'excludeAll' });
  }

  async getReportContent(proposalId: string, reportId: string, user: IRequestUser): Promise<string> {
    const projection = {
      'reports.content': 1,
      'reports._id': 1,
    };
    const proposal = await this.proposalCrudService.findDocument(proposalId, user, projection, false);

    const report = proposal.reports.find((report) => report._id.toString() === reportId);
    if (!report) {
      throw new NotFoundException('Report not found');
    }

    return report.content;
  }

  async updateReport(
    proposalId: string,
    reportId: string,
    reportUpdateDto: ReportUpdateDto,
    files: Express.Multer.File[],
    user: IRequestUser,
  ): Promise<ReportGetDto> {
    const { keepUploads, ...updateDto } = reportUpdateDto;
    validateReportUploads(keepUploads, files);

    const proposal = await this.proposalCrudService.findDocument(
      proposalId,
      user,
      this.projection,
      true,
      ModificationContext.Report,
    );

    if (proposal.type === ProposalType.RegisteringForm) {
      return await this.registrationFormReportService.handleReportUpdate(
        proposal,
        reportId,
        reportUpdateDto,
        files,
        user,
      );
    }

    const reportIdx = proposal.reports.findIndex((report: ReportDocument) => report._id.toString() === reportId);

    if (reportIdx === -1) {
      throw new NotFoundException('Report not found');
    }

    const conditionToRemove = (upload: Upload) => !keepUploads.includes(upload._id.toString());
    const removedUploads = removeInPlaceAndReturnRemoved(proposal.reports[reportIdx].uploads, conditionToRemove);

    if (removedUploads.length > 0) {
      await this.storageService.deleteManyBlobs(removedUploads.map((upload) => upload.blobName));
    }

    const uploadTasks = files.map(async (file) => {
      const uploadType = UseCaseUpload.ReportUpload;
      const blobName = getBlobName(proposal._id, uploadType, reportId);
      await this.storageService.uploadFile(blobName, file, user);
      const upload = new UploadDto(blobName, file, uploadType, user);
      return upload;
    });

    const taskResults = await Promise.allSettled(uploadTasks);
    taskResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        addReportUpload(proposal.reports[reportIdx], result.value);
      }
    });

    proposal.reports[reportIdx].title = updateDto.title;
    proposal.reports[reportIdx].content = updateDto.content;

    this.registrationFormReportService.setRegistrationOutOfSync(proposal);

    const saveResult = await proposal.save();
    const report = saveResult.reports.find((report) => report._id.toString() === reportId) as ReportDocument;

    const downloadLinkTasks: Promise<void>[] = [];

    const plainReport = report.toObject();
    plainReport.uploads.forEach((upload) => {
      const task = async () => {
        let downloadUrl: string;
        downloadUrl = await this.storageService.getSasUrl(upload.blobName, true);
        (upload as UploadGetDto).downloadUrl = downloadUrl;
      };
      downloadLinkTasks.push(task());
    });

    const syncRegistration = this.registrationFormReportService.handleReportUpdate(
      proposal,
      reportId,
      reportUpdateDto,
      files,
      user,
    );
    await Promise.allSettled([...downloadLinkTasks, syncRegistration]);

    return plainToInstance(ReportGetDto, plainReport, { strategy: 'excludeAll' });
  }

  async deleteReport(proposalId: string, reportId: string, user: IRequestUser): Promise<void> {
    const proposal = await this.proposalCrudService.findDocument(
      proposalId,
      user,
      this.projection,
      true,
      ModificationContext.Report,
    );

    if (proposal.type === ProposalType.RegisteringForm) {
      return this.registrationFormReportService.handleReportDelete(proposal, reportId, user);
    }

    const reportIdx = proposal.reports.findIndex((report: ReportDocument) => report._id.toString() === reportId);

    if (reportIdx === -1) {
      return;
    }

    if (proposal.reports[reportIdx].uploads.length > 0) {
      await this.storageService.deleteManyBlobs(proposal.reports[reportIdx].uploads.map((upload) => upload.blobName));
    }

    proposal.reports.splice(reportIdx, 1);

    this.registrationFormReportService.setRegistrationOutOfSync(proposal);

    await proposal.save();
    await this.registrationFormReportService.handleReportDelete(proposal, reportId, user);
  }
}
