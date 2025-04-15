import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { plainToClass } from 'class-transformer';
import { AdminConfigService } from 'src/modules/admin/admin-config.service';
import { DataPrivacyTextSingleLanguage } from 'src/modules/admin/dto/data-privacy/data-privacy-texts.dto';
import { PlatformIdentifier } from 'src/modules/admin/enums/platform-identifier.enum';
import { SupportedLanguages } from 'src/shared/constants/global.constants';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import { findByKeyNested } from 'src/shared/utils/find-by-key-nested.util';
import { StorageService } from '../../storage/storage.service';
import { EventEngineService } from '../../event-engine/event-engine.service';
import { FeasibilityService } from '../../feasibility/feasibility.service';
import { PdfEngineService } from '../../pdf-engine/pdf-engine.service';
import { KeycloakService } from '../../user/keycloak.service';
import { FdpgChecklistUpdateDto, initChecklist, FdpgChecklistGetDto } from '../dto/proposal/fdpg-checklist.dto';
import { ResearcherIdentityDto } from '../dto/proposal/participants/researcher.dto';
import { ProposalGetDto } from '../dto/proposal/proposal.dto';
import { UploadDto } from '../dto/upload.dto';
import { ProposalValidation } from '../enums/porposal-validation.enum';
import { ProposalStatus } from '../enums/proposal-status.enum';
import { SupportedMimetype } from '../enums/supported-mime-type.enum';
import { UseCaseUpload } from '../enums/upload-type.enum';
import { updateFdpgChecklist } from '../utils/add-fdpg-checklist.util';
import { flattenToLanguage } from '../utils/flatten-to-language.util';
import {
  addHistoryItemForChangedDeadline,
  addHistoryItemForProposalLock,
  addHistoryItemForStatus,
} from '../utils/proposal-history.util';
import { addUpload, getBlobName } from '../utils/proposal.utils';
import { validateFdpgCheckStatus } from '../utils/validate-fdpg-check-status.util';
import { validateStatusChange } from '../utils/validate-status-change.util';
import { ProposalCrudService } from './proposal-crud.service';
import { StatusChangeService } from './status-change.service';
import { OutputGroup } from 'src/shared/enums/output-group.enum';
import { ProposalDocument } from '../schema/proposal.schema';
import { SetAdditionalLocationInformationDto } from '../dto/set-additional-location-information.dto';
import { AdditionalLocationInformation } from '../schema/sub-schema/additional-location-information.schema';
import { validateUpdateAdditionalInformationAccess } from '../utils/validate-misc.util';
import { defaultDueDateValues, DueDateEnum } from '../enums/due-date.enum';
import { Role } from 'src/shared/enums/role.enum';
import { isDateChangeValid, isDateOrderValid } from '../utils/due-date-verification.util';
import { getDueDateChangeList, setDueDate } from '../utils/due-date.util';
import { SchedulerService } from 'src/modules/scheduler/scheduler.service';

@Injectable()
export class ProposalMiscService {
  constructor(
    private proposalCrudService: ProposalCrudService,
    private eventEngineService: EventEngineService,
    private storageService: StorageService,
    private statusChangeService: StatusChangeService,
    private keycloakService: KeycloakService,
    private pdfEngineService: PdfEngineService,
    private schedulerRegistry: SchedulerRegistry,
    private feasibilityService: FeasibilityService,
    private adminConfigService: AdminConfigService,
    private schedulerService: SchedulerService,
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
      const proposal = await this.proposalCrudService.findDocument(proposalId, user);
      const dataPrivacyTextForUsage = await this.createPrivacyTextForUsage(proposal);

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
    const name = `ContractTimeout-${proposalId}`;
    const timeout = setTimeout(async () => await task(), milliseconds);
    this.schedulerRegistry.addTimeout(name, timeout);
  }

  async getPdfProposalFile(proposalId: string, user: IRequestUser): Promise<Buffer> {
    const proposal = await this.proposalCrudService.findDocument(proposalId, user);
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

  async createPrivacyTextForUsage(proposal: ProposalDocument): Promise<any[]> {
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

  async setFdpgChecklist(
    proposalId: string,
    checklistUpdate: FdpgChecklistUpdateDto,
    user: IRequestUser,
  ): Promise<FdpgChecklistGetDto> {
    const toBeUpdated = await this.proposalCrudService.findDocument(proposalId, user, undefined, true);
    if (!toBeUpdated) throw new NotFoundException('Proposal not found');

    if (!toBeUpdated.fdpgChecklist) {
      toBeUpdated.fdpgChecklist = initChecklist();
    }

    updateFdpgChecklist(toBeUpdated, checklistUpdate, user.fullName);
    await toBeUpdated.save();

    return toBeUpdated.fdpgChecklist as FdpgChecklistGetDto;
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

  async setFdpgCheckNotes(proposalId: string, text: string, user: IRequestUser): Promise<void> {
    const toBeUpdated = await this.proposalCrudService.findDocument(proposalId, user);
    validateFdpgCheckStatus(toBeUpdated);
    toBeUpdated.fdpgCheckNotes = text;
    await toBeUpdated.save();
  }

  async updateAdditionalInformationForLocation(
    proposalId: string,
    additionalInformationDto: SetAdditionalLocationInformationDto,
    user: IRequestUser,
  ): Promise<void> {
    const toBeUpdated = await this.proposalCrudService.findDocument(proposalId, user);

    validateUpdateAdditionalInformationAccess(toBeUpdated);

    toBeUpdated.additionalLocationInformation = (toBeUpdated.additionalLocationInformation ?? []).filter(
      (additionalInformation) => additionalInformation.location !== user.miiLocation,
    );

    const additionalInformation: Omit<AdditionalLocationInformation, '_id' | 'updatedAt' | 'createdAt'> = {
      location: user.miiLocation,
      legalBasis: additionalInformationDto.legalBasis,
      locationPublicationName: additionalInformationDto.locationPublicationName,
    };

    toBeUpdated.additionalLocationInformation.push(additionalInformation as AdditionalLocationInformation);

    await toBeUpdated.save();
  }

  async setDeadlines(proposalId: string, dto: Record<DueDateEnum, Date | null>, user: IRequestUser): Promise<void> {
    const proposal = await this.proposalCrudService.findDocument(proposalId, user);

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    // Ensure only FdpgMember can modify deadlines
    if (!user.roles.includes(Role.FdpgMember)) {
      throw new ForbiddenException('You do not have permission to modify deadlines');
    }

    const deadlines = this.getDeadlinesByDto(dto);

    const updatedDeadlines: Record<DueDateEnum, Date | null> = {
      ...proposal.deadlines,
      ...deadlines,
    };

    const changeList = getDueDateChangeList(proposal.deadlines, updatedDeadlines);

    const orderValid = isDateOrderValid(updatedDeadlines);
    const dateChangeValid = isDateChangeValid(changeList, proposal.status);
    if (!orderValid) {
      throw new BadRequestException('Date order is not logical');
    }
    if (!dateChangeValid) {
      throw new BadRequestException('Date for invalid state was changed');
    }

    if (Object.keys(changeList).length > 0) {
      this.schedulerService.removeAndCreateEventsByChangeList(proposal, changeList);
    }

    Object.keys(changeList).map((deadlineType) =>
      addHistoryItemForChangedDeadline(deadlineType as DueDateEnum, proposal, user),
    );

    proposal.deadlines = updatedDeadlines;

    setDueDate(proposal, !!proposal.researcherSignedAt);

    await proposal.save();
    if (Object.keys(changeList).length > 0) {
      await this.eventEngineService.handleDeadlineChange(proposal, changeList);
    }
  }

  private getDeadlinesByDto(dto: Record<DueDateEnum, Date | null>): Record<DueDateEnum, Date | null> {
    const deadlines: Record<DueDateEnum, Date | null> = {} as Record<DueDateEnum, Date | null>;

    Object.keys(defaultDueDateValues).forEach(
      (key) => (deadlines[key] = dto[key] ? new Date(dto[key]) : defaultDueDateValues[key]),
    );

    return deadlines;
  }
}
