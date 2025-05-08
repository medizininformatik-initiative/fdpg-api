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
    if (proposal.userProject.feasibility.id !== undefined) {
      const queryContent = await this.feasibilityService.getQueryContentById(proposal.userProject.feasibility.id);
      const feasibilityBuffer = Buffer.from(JSON.stringify(queryContent, null, 2));
      const feasibilityFile: Express.Multer.File = {
        buffer: feasibilityBuffer,
        originalname: 'Machbarkeits-Anfrage.json',
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
    }
  }

  async createProposalPdf(proposal: ProposalDocument, user: IRequestUser) {
    const task = async () => {
      const dataPrivacyTextForUsage = await this.createPrivacyTextForUsage(proposal);
      const pdfBuffer = await this.createPdfBuffer(proposal, dataPrivacyTextForUsage);
      const pdfFile: Express.Multer.File = {
        buffer: pdfBuffer,
        originalname: `${proposal.projectAbbreviation}_proposal.pdf`,
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
    const name = `ContractTimeout-${proposal._id}`;
    const timeout = setTimeout(async () => await task(), milliseconds);
    this.schedulerRegistry.addTimeout(name, timeout);
  }

  async getPdfProposalFile(proposal: ProposalDocument): Promise<Buffer> {
    const dataPrivacyTextForUsage = await this.createPrivacyTextForUsage(proposal);
    const pdfBuffer = await this.createPdfBuffer(proposal, dataPrivacyTextForUsage);
    return pdfBuffer;
  }

  async createPdfBuffer(proposal: ProposalDocument, dataPrivacyTextForUsage: any[]): Promise<Buffer> {
    const plain = proposal.toObject();
    const getDto = plainToClass(ProposalGetDto, plain, {
      strategy: 'excludeAll',
      groups: [ProposalValidation.IsOutput, OutputGroup.PdfOutput],
    });
    const pdfBuffer = await this.pdfEngineService.createProposalPdf(getDto, dataPrivacyTextForUsage);
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
