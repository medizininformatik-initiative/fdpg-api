import { Injectable } from '@nestjs/common';
import { AdminConfigService } from 'src/modules/admin/admin-config.service';
import { FeasibilityService } from 'src/modules/feasibility/feasibility.service';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import { SupportedMimetype } from '../enums/supported-mime-type.enum';
import { addUpload, getBlobName } from '../utils/proposal.utils';
import { UseCaseUpload } from '../enums/upload-type.enum';
import { StorageService } from 'src/modules/storage/storage.service';
import { UploadDto } from '../dto/upload.dto';
import { Proposal, ProposalDocument } from '../schema/proposal.schema';
import { plainToClass } from 'class-transformer';
import { OutputGroup } from 'src/shared/enums/output-group.enum';
import { ProposalValidation } from '../enums/porposal-validation.enum';
import { SupportedLanguages } from 'src/shared/constants/global.constants';
import { PlatformIdentifier } from 'src/modules/admin/enums/platform-identifier.enum';
import { flattenToLanguage } from '../utils/flatten-to-language.util';
import { DataPrivacyTextSingleLanguage } from 'src/modules/admin/dto/data-privacy/data-privacy-texts.dto';
import { PdfEngineService } from 'src/modules/pdf-engine/pdf-engine.service';
import { ProposalGetDto } from '../dto/proposal/proposal.dto';
import { SchedulerRegistry } from '@nestjs/schedule';
import { SelectedCohort } from '../schema/sub-schema/user-project/selected-cohort.schema';

@Injectable()
export class ProposalPdfService {
  constructor(
    private feasibilityService: FeasibilityService,
    private adminConfigService: AdminConfigService,
    private storageService: StorageService,
    private pdfEngineService: PdfEngineService,
    private schedulerRegistry: SchedulerRegistry,
  ) {}

  async fetchAndGenerateFeasibilityPdf(proposal: Proposal, user: IRequestUser) {
    const hasLegacyFeasibilityId = proposal.userProject.feasibility?.id !== undefined;
    const selectedCohorts = proposal.userProject.cohorts?.selectedCohorts || [];
    if (hasLegacyFeasibilityId || selectedCohorts.length > 0) {
      const cohorts: SelectedCohort[] = selectedCohorts.map((cohort: SelectedCohort) => ({
        feasibilityQueryId: cohort.feasibilityQueryId,
        label: cohort.label,
        comment: cohort.comment,
        uploadId: cohort.uploadId,
        isManualUpload: cohort.isManualUpload,
      }));

      if (
        hasLegacyFeasibilityId &&
        !cohorts.some((cohort) => cohort.feasibilityQueryId === proposal.userProject.feasibility.id)
      ) {
        const newCohort: SelectedCohort = {
          feasibilityQueryId: proposal.userProject.feasibility.id,
          label: 'Machbarkeits-Anfrage',
          isManualUpload: false,
          comment: undefined,
        };
        proposal.userProject.cohorts?.selectedCohorts?.push(newCohort);
      }

      const updatedStatus = await Promise.allSettled(
        proposal.userProject.cohorts?.selectedCohorts?.map(async (cohort) => {
          if (cohort.isManualUpload) {
            return cohort;
          }

          const queryContent = await this.feasibilityService.getQueryContentById(cohort.feasibilityQueryId, 'JSON');
          const feasibilityBuffer = Buffer.from(JSON.stringify(queryContent, null, 2));
          const feasibilityFile: Express.Multer.File = {
            buffer: feasibilityBuffer,
            originalname: `${cohort.label}.json`,
            mimetype: SupportedMimetype.Json,
            size: Buffer.byteLength(feasibilityBuffer),
          } as Express.Multer.File;

          const feasibilityBlobName = getBlobName(proposal._id, UseCaseUpload.FeasibilityQuery);
          await this.storageService.uploadFile(feasibilityBlobName, feasibilityFile, user);
          const feasibilityUpload = new UploadDto(
            feasibilityBlobName,
            feasibilityFile,
            UseCaseUpload.FeasibilityQuery,
            user,
          );

          addUpload(proposal, feasibilityUpload);
          cohort.uploadId = feasibilityUpload._id;

          return cohort;
        }),
      );

      const failed = updatedStatus.filter((req) => req.status === 'rejected').map((req) => req.reason);

      if (failed.length > 0) {
        console.error(
          `Some cohorts could not be saved for proposalId '${proposal._id}': ${failed.reduce((prev, curr) => prev + '\n\n' + curr, '')}`,
        );
      }
    }
  }

  async createProposalPdf(proposal: ProposalDocument, user: IRequestUser) {
    await Promise.all(
      (proposal.selectedDataSources ?? [PlatformIdentifier.Mii]).map(async (dataSource) => {
        const task = async () => {
          const dataPrivacyTextForUsage = await this.createPrivacyTextForUsage(proposal);
          const pdfBuffer = await this.createPdfBuffer(proposal, dataPrivacyTextForUsage, [dataSource]);
          const pdfFile: Express.Multer.File = {
            buffer: pdfBuffer,
            originalname: `${proposal.projectAbbreviation}_proposal_${dataSource}.pdf`,
            mimetype: SupportedMimetype.Pdf,
            size: Buffer.byteLength(pdfBuffer),
          } as Express.Multer.File;
          const pdfBlobName = getBlobName(proposal._id, UseCaseUpload.ProposalPDF);
          await this.storageService.uploadFile(pdfBlobName, pdfFile, user);
          const pdfUpload = new UploadDto(pdfBlobName, pdfFile, UseCaseUpload.ProposalPDF, user);
          addUpload(proposal, pdfUpload);

          await proposal.save();
        };

        // We schedule the task to release the thread
        const milliseconds = 500;
        const name = `ContractTimeout-${proposal._id}_${dataSource}`;
        const timeout = setTimeout(async () => await task(), milliseconds);
        this.schedulerRegistry.addTimeout(name, timeout);
      }),
    );
  }

  async getPdfProposalFile(proposal: ProposalDocument, user: IRequestUser): Promise<Buffer> {
    const dataPrivacyTextForUsage = await this.createPrivacyTextForUsage(proposal);
    const pdfBuffer = await this.createPdfBuffer(proposal, dataPrivacyTextForUsage, user.assignedDataSources);
    return pdfBuffer;
  }

  async createPdfBuffer(
    proposal: ProposalDocument,
    dataPrivacyTextForUsage: any[],
    dataSources: PlatformIdentifier[],
  ): Promise<Buffer> {
    const plain = proposal.toObject();
    const getDto = plainToClass(ProposalGetDto, plain, {
      strategy: 'excludeAll',
      groups: [ProposalValidation.IsOutput, OutputGroup.PdfOutput],
    });
    const pdfBuffer = await this.pdfEngineService.createProposalPdf(getDto, dataPrivacyTextForUsage, dataSources);
    return pdfBuffer;
  }

  async createPrivacyTextForUsage(proposal: Proposal): Promise<any[]> {
    const pdfLanguage: SupportedLanguages = 'de';
    let dataPrivacyTextForUsage = [];
    if (proposal.userProject.typeOfUse.usage.length !== 0) {
      const dataPrivacyText = await this.adminConfigService.getDataPrivacyConfig(
        proposal.platform ?? PlatformIdentifier.Mii,
      );

      const dataPrivacyTextForLanguage = flattenToLanguage<DataPrivacyTextSingleLanguage>(
        dataPrivacyText.messages,
        pdfLanguage,
      );

      dataPrivacyTextForUsage = proposal.userProject.typeOfUse.usage.map((usage) => dataPrivacyTextForLanguage[usage]);
    }
    return dataPrivacyTextForUsage;
  }
}
