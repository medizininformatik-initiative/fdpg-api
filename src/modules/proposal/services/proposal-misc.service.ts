import { Injectable, NotFoundException } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { plainToClass } from 'class-transformer';
import { AdminConfigService } from 'src/modules/admin/admin-config.service';
import { DataPrivacyTextSingleLanguage } from 'src/modules/admin/dto/data-privacy/data-privacy-texts.dto';
import { PlatformIdentifier } from 'src/modules/admin/enums/platform-identifier.enum';
import { SupportedLanguages } from 'src/shared/constants/global.constants';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import { findByKeyNested } from 'src/shared/utils/find-by-key-nested.util';
import { AzureStorageService } from '../../azure-storage/azure-storage.service';
import { EventEngineService } from '../../event-engine/event-engine.service';
import { FeasibilityService } from '../../feasibility/feasibility.service';
import { PdfEngineService } from '../../pdf-engine/pdf-engine.service';
import { KeycloakService } from '../../user/keycloak.service';
import { FdpgChecklistSetDto } from '../dto/proposal/fdpg-checklist.dto';
import { ResearcherIdentityDto } from '../dto/proposal/participants/researcher.dto';
import { ProposalGetDto } from '../dto/proposal/proposal.dto';
import { UploadDto } from '../dto/upload.dto';
import { ProposalValidation } from '../enums/porposal-validation.enum';
import { ProposalStatus } from '../enums/proposal-status.enum';
import { SupportedMimetype } from '../enums/supported-mime-type.enum';
import { UseCaseUpload } from '../enums/upload-type.enum';
import { addFdpgChecklist } from '../utils/add-fdpg-checklist.util';
import { flattenToLanguage } from '../utils/flatten-to-language.util';
import { addHistoryItemForProposalLock, addHistoryItemForStatus } from '../utils/proposal-history.util';
import { addUpload, getBlobName } from '../utils/proposal.utils';
import { validateFdpgChecklist } from '../utils/validate-fdpg-checklist.util';
import { validateStatusChange } from '../utils/validate-status-change.util';
import { ProposalCrudService } from './proposal-crud.service';
import { StatusChangeService } from './status-change.service';

@Injectable()
export class ProposalMiscService {
  constructor(
    private proposalCrudService: ProposalCrudService,
    private eventEngineService: EventEngineService,
    private azureStorageService: AzureStorageService,
    private statusChangeService: StatusChangeService,
    private keycloakService: KeycloakService,
    private pdfEngineService: PdfEngineService,
    private schedulerRegistry: SchedulerRegistry,
    private feasibilityService: FeasibilityService,
    private adminConfigService: AdminConfigService,
  ) {}

  async getResearcherInfo(proposalId: string, user: IRequestUser): Promise<ResearcherIdentityDto[]> {
    const document = await this.proposalCrudService.findDocument(proposalId, user);
    const researchers = document.participants.map(
      (participant) => new ResearcherIdentityDto(participant.researcher, participant.participantCategory),
    );

    const tasks = researchers.map((researcher) => {
      if (researcher.email) {
        return this.keycloakService.getUsers({ email: researcher.email, exact: true });
      }
    });

    const results = await Promise.allSettled(tasks);

    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value.length > 0) {
        researchers.map((researcher) => {
          if (researcher.email.toLocaleLowerCase() === result.value[0].email.toLocaleLowerCase()) {
            const isEmailVerified = !result.value.some((user) => !user.emailVerified);
            const hasRequiredActions = result.value.some((user) => user.requiredActions.length > 0);
            researcher.isExisting = true;
            researcher.isEmailVerified = isEmailVerified;
            researcher.isRegistrationComplete = !hasRequiredActions && isEmailVerified;
            researcher.username = result.value.length === 1 ? result.value[0].username : undefined;
          }
        });
      }
    });

    return researchers;
  }

  async setStatus(proposalId: string, status: ProposalStatus, user: IRequestUser): Promise<void> {
    const toBeUpdated = await this.proposalCrudService.findDocument(proposalId, user, undefined, true);
    const oldStatus = toBeUpdated.status;
    if (status === oldStatus) {
      return;
    }
    validateStatusChange(toBeUpdated, status, user);

    if (oldStatus !== ProposalStatus.Draft) {
      // TODO: Validation of content if not DRAFT
    }

    toBeUpdated.status = status;
    await this.statusChangeService.handleEffects(toBeUpdated, oldStatus, user);
    addHistoryItemForStatus(toBeUpdated, user, oldStatus);
    const saveResult = await toBeUpdated.save();
    await this.eventEngineService.handleProposalStatusChange(saveResult);

    if (toBeUpdated.status === ProposalStatus.LocationCheck) {
      this.fetchFeasibilityAndGeneratePdf(toBeUpdated._id, user);
    }
  }

  async setIsLockedStatus(proposalId: string, isLocked: boolean, user: IRequestUser): Promise<void> {
    const toBeUpdated = await this.proposalCrudService.findDocument(proposalId, user);
    const oldStatus = toBeUpdated.isLocked;
    if (isLocked === oldStatus) {
      return;
    }

    toBeUpdated.isLocked = isLocked;
    addHistoryItemForProposalLock(toBeUpdated, user, isLocked);

    const saveResult = await toBeUpdated.save();

    await this.eventEngineService.handleProposalLockChange(saveResult);
  }

  private fetchFeasibilityAndGeneratePdf(proposalId: string, user: IRequestUser) {
    const task = async () => {
      const pdfLanguage: SupportedLanguages = 'de';
      const proposal = await this.proposalCrudService.findDocument(proposalId, user);

      let dataPrivacyTextForUsage = [];
      if (proposal.userProject.typeOfUse.usage.length !== 0) {
        const dataPrivacyText = await this.adminConfigService.getDataPrivacyConfig(
          proposal.platform ?? PlatformIdentifier.Mii,
        );

        const dataPrivacyTextForLanguage = flattenToLanguage<DataPrivacyTextSingleLanguage>(
          dataPrivacyText.messages,
          pdfLanguage,
        );

        dataPrivacyTextForUsage = proposal.userProject.typeOfUse.usage.map(
          (usage) => dataPrivacyTextForLanguage[usage],
        );
      }

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
        await this.azureStorageService.uploadFile(feasibilityBlobName, feasibilityFile, user);
        const feasibilityUpload = new UploadDto(
          feasibilityBlobName,
          feasibilityFile,
          UseCaseUpload.FeasibilityQuery,
          user,
        );
        addUpload(proposal, feasibilityUpload);
      }

      const plain = proposal.toObject();
      const getDto = plainToClass(ProposalGetDto, plain, {
        strategy: 'excludeAll',
        groups: [ProposalValidation.IsOutput],
      });
      const pdfBuffer = await this.pdfEngineService.createProposalPdf(getDto, dataPrivacyTextForUsage);
      const pdfFile: Express.Multer.File = {
        buffer: pdfBuffer,
        originalname: `${proposal.projectAbbreviation}.pdf`,
        mimetype: SupportedMimetype.Pdf,
        size: Buffer.byteLength(pdfBuffer),
      } as Express.Multer.File;
      const pdfBlobName = getBlobName(proposal._id, UseCaseUpload.ProposalPDF);
      await this.azureStorageService.uploadFile(pdfBlobName, pdfFile, user);
      const pdfUpload = new UploadDto(pdfBlobName, pdfFile, UseCaseUpload.ProposalPDF, user);
      addUpload(proposal, pdfUpload);

      await proposal.save();
    };

    // We schedule the task to release the thread
    const milliseconds = 500;
    const name = `ContractTimeout-${proposalId}`;
    const timeout = setTimeout(async () => await task(), milliseconds);
    this.schedulerRegistry.addTimeout(name, timeout);
  }

  async setFdpgChecklist(proposalId: string, checklist: FdpgChecklistSetDto, user: IRequestUser): Promise<void> {
    const toBeUpdated = await this.proposalCrudService.findDocument(proposalId, user, undefined, true);
    validateFdpgChecklist(toBeUpdated);
    addFdpgChecklist(toBeUpdated, checklist);
    await toBeUpdated.save();
  }

  async markSectionAsDone(proposalId: string, sectionId: string, isDone: boolean, user: IRequestUser): Promise<void> {
    const proposal = await this.proposalCrudService.findDocument(proposalId, user);
    const section = findByKeyNested(proposal.toObject(), '_id', sectionId);

    if (!section) {
      throw new NotFoundException();
    }

    const path = `${section.path.join('.')}.isDone`;
    proposal.set(path, isDone);

    await proposal.save();
  }
}
