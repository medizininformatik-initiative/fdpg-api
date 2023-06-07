import { Injectable, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import { removeInPlaceAndReturnRemoved } from 'src/shared/utils/array.utils';
import { AzureStorageService } from '../../azure-storage/azure-storage.service';
import { EventEngineService } from '../../event-engine/event-engine.service';
import { ReportCreateDto, ReportDto, ReportGetDto, ReportUpdateDto } from '../dto/proposal/report.dto';
import { UploadDto, UploadGetDto } from '../dto/upload.dto';
import { UseCaseUpload } from '../enums/upload-type.enum';
import { ProposalCrudService } from './proposal-crud.service';
import { ReportDocument } from '../schema/sub-schema/report.schema';
import { Upload } from '../schema/sub-schema/upload.schema';
import { addReport, addReportUpload, getBlobName } from '../utils/proposal.utils';
import { validateReportUploads } from '../utils/validate-report.util';

@Injectable()
export class ProposalReportService {
  constructor(
    private proposalCrudService: ProposalCrudService,
    private eventEngineService: EventEngineService,
    private azureStorageService: AzureStorageService,
  ) {}

  async createReport(
    proposalId: string,
    reportCreateDto: ReportCreateDto,
    files: Express.Multer.File[],
    user: IRequestUser,
  ): Promise<ReportGetDto> {
    // The owner is necessary for access control
    const projection = { projectAbbreviation: 1, reports: 1, owner: 1 };
    const proposal = await this.proposalCrudService.findDocument(proposalId, user, projection, true);

    const report = new ReportDto(reportCreateDto);
    const uploadTasks = files.map(async (file) => {
      const uploadType = UseCaseUpload.ReportUpload;
      const blobName = getBlobName(proposal._id, uploadType, report._id);
      await this.azureStorageService.uploadFile(blobName, file, user);
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

    await proposal.save();

    const downloadTasks: Promise<void>[] = [];

    report.uploads.forEach((upload) => {
      const task = async () => {
        const downloadUrl = await this.azureStorageService.getSasUrl(upload.blobName, true);
        (upload as UploadGetDto).downloadUrl = downloadUrl;
      };
      downloadTasks.push(task());
    });

    const sendNotifications = this.eventEngineService.handleProposalReportCreate(proposal, report);
    await Promise.allSettled([...downloadTasks, sendNotifications]);

    const plain = structuredClone(report);
    return plainToInstance(ReportGetDto, plain, { strategy: 'excludeAll' });
  }

  async getAllReports(proposalId: string, user: IRequestUser): Promise<ReportGetDto[]> {
    const projection = {
      'reports._id': 1,
      'reports.uploads': 1,
      'reports.title': 1,
      'reports.createdAt': 1,
      'reports.updatedAt': 1,
    };
    const proposal = await this.proposalCrudService.findDocument(proposalId, user, projection, false);

    const tasks: Promise<void>[] = [];
    proposal.reports.forEach((report) => {
      report.uploads.forEach((upload) => {
        const task = async () => {
          const downloadUrl = await this.azureStorageService.getSasUrl(upload.blobName, true);
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

    // The owner is necessary for access control
    const projection = { projectAbbreviation: 1, reports: 1, owner: 1 };
    const proposal = await this.proposalCrudService.findDocument(proposalId, user, projection, true);

    const reportIdx = proposal.reports.findIndex((report: ReportDocument) => report._id.toString() === reportId);

    if (reportIdx === -1) {
      throw new NotFoundException('Report not found');
    }

    const conditionToRemove = (upload: Upload) => !keepUploads.includes(upload._id.toString());
    const removedUploads = removeInPlaceAndReturnRemoved(proposal.reports[reportIdx].uploads, conditionToRemove);

    if (removedUploads.length > 0) {
      await this.azureStorageService.deleteManyBlobs(removedUploads.map((upload) => upload.blobName));
    }

    const uploadTasks = files.map(async (file) => {
      const uploadType = UseCaseUpload.ReportUpload;
      const blobName = getBlobName(proposal._id, uploadType, reportId);
      await this.azureStorageService.uploadFile(blobName, file, user);
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

    const saveResult = await proposal.save();
    const report = saveResult.reports.find((report) => report._id.toString() === reportId) as ReportDocument;

    const downloadLinkTasks: Promise<void>[] = [];

    const plainReport = report.toObject();
    plainReport.uploads.forEach((upload) => {
      const task = async () => {
        const downloadUrl = await this.azureStorageService.getSasUrl(upload.blobName, true);
        (upload as UploadGetDto).downloadUrl = downloadUrl;
      };
      downloadLinkTasks.push(task());
    });

    await Promise.allSettled(downloadLinkTasks);

    await this.eventEngineService.handleProposalReportUpdate(proposal, report);

    return plainToInstance(ReportGetDto, plainReport, { strategy: 'excludeAll' });
  }

  async deleteReport(proposalId: string, reportId: string, user: IRequestUser): Promise<void> {
    // The owner is necessary for access control
    const projection = { projectAbbreviation: 1, reports: 1, owner: 1 };
    const proposal = await this.proposalCrudService.findDocument(proposalId, user, projection, true);

    const reportIdx = proposal.reports.findIndex((report: ReportDocument) => report._id.toString() === reportId);

    if (reportIdx === -1) {
      return;
    }

    if (proposal.reports[reportIdx].uploads.length > 0) {
      await this.azureStorageService.deleteManyBlobs(
        proposal.reports[reportIdx].uploads.map((upload) => upload.blobName),
      );
    }

    const deletedReports = proposal.reports.splice(reportIdx, 1);

    await this.eventEngineService.handleProposalReportDelete(proposal, deletedReports[0]);
    await proposal.save();
  }
}
