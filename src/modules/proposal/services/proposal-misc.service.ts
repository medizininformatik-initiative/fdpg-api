import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import { MiiLocation } from 'src/shared/constants/mii-locations';
import { findByKeyNested } from 'src/shared/utils/find-by-key-nested.util';
import { EventEngineService } from '../../event-engine/event-engine.service';
import { KeycloakService } from '../../user/keycloak.service';
import { FdpgChecklistUpdateDto, initChecklist } from '../dto/proposal/fdpg-checklist.dto';
import { ResearcherIdentityDto } from '../dto/proposal/participants/researcher.dto';
import { ProposalStatus } from '../enums/proposal-status.enum';
import { updateFdpgChecklist } from '../utils/add-fdpg-checklist.util';
import {
  addHistoryItemForChangedDeadline,
  addHistoryItemForProposalLock,
  addHistoryItemForStatus,
  addHistoryItemForParticipantsUpdated,
  addHistoryItemForParticipantRemoved,
} from '../utils/proposal-history.util';
import { validateFdpgCheckStatus } from '../utils/validate-fdpg-check-status.util';
import { validateStatusChange } from '../utils/validate-status-change.util';
import { ProposalCrudService } from './proposal-crud.service';
import { StatusChangeService } from './status-change.service';
import { SetAdditionalLocationInformationDto } from '../dto/set-additional-location-information.dto';
import { AdditionalLocationInformation } from '../schema/sub-schema/additional-location-information.schema';
import { validateUpdateAdditionalInformationAccess } from '../utils/validate-misc.util';
import { defaultDueDateValues, DueDateEnum } from '../enums/due-date.enum';
import { Role } from 'src/shared/enums/role.enum';
import { isDateChangeValid, isDateOrderValid } from '../utils/due-date-verification.util';
import { getDueDateChangeList, setDueDate } from '../utils/due-date.util';
import { SchedulerService } from 'src/modules/scheduler/scheduler.service';
import { IChecklistItem } from '../dto/proposal/checklist.types';
import { ProposalFormService } from 'src/modules/proposal-form/proposal-form.service';
import { ProposalFormDto } from 'src/modules/proposal-form/dto/proposal-form.dto';
import { ProposalPdfService } from './proposal-pdf.service';
import { ProposalValidation } from '../enums/porposal-validation.enum';
import { plainToClass } from 'class-transformer';
import { UseCaseUpload } from '../enums/upload-type.enum';
import { addUpload, getBlobName } from '../utils/proposal.utils';
import { UploadDto, UploadGetDto } from '../dto/upload.dto';
import { StorageService } from 'src/modules/storage/storage.service';
import { SelectedCohort } from '../schema/sub-schema/user-project/selected-cohort.schema';
import { SelectedCohortDto } from '../dto/proposal/user-project/selected-cohort.dto';
import { ValidationException } from 'src/exceptions/validation/validation.exception';
import { ValidationErrorInfo } from 'src/shared/dto/validation/validation-error-info.dto';
import { BadRequestError } from 'src/shared/enums/bad-request-error.enum';
import { validateModifyingCohortAccess, validateProposalAccess } from '../utils/validate-access.util';
import { ProposalUploadService } from './proposal-upload.service';
import { AutomaticSelectedCohortUploadDto, SelectedCohortUploadDto } from '../dto/cohort-upload.dto';
import { FeasibilityService } from 'src/modules/feasibility/feasibility.service';
import { ProposalGetDto } from '../dto/proposal/proposal.dto';
import { MiiLocationService } from 'src/modules/mii-location/mii-location.service';
import { ParticipantRoleType } from '../enums/participant-role-type.enum';
import { Participant } from '../schema/sub-schema/participant.schema';
import { mergeDeep } from '../utils/merge-proposal.util';
import { DizDetailsCreateDto, DizDetailsGetDto, DizDetailsUpdateDto } from '../dto/proposal/diz-details.dto';
import { ConflictException } from '@nestjs/common';
import { recalculateAllUacDelayStatus } from '../utils/uac-delay-tracking.util';
import { Types } from 'mongoose';
import { convert } from 'html-to-text';

@Injectable()
export class ProposalMiscService {
  constructor(
    private proposalCrudService: ProposalCrudService,
    private eventEngineService: EventEngineService,
    private statusChangeService: StatusChangeService,
    private keycloakService: KeycloakService,
    private schedulerService: SchedulerService,
    private proposalPdfService: ProposalPdfService,
    private proposalFormService: ProposalFormService,
    private storageService: StorageService,
    private uploadService: ProposalUploadService,
    private feasibilityService: FeasibilityService,
    private miiLocationService: MiiLocationService,
  ) {}

  async getResearcherInfo(proposalId: string, user: IRequestUser): Promise<ResearcherIdentityDto[]> {
    const document = await this.proposalCrudService.findDocument(proposalId, user);
    const researchers = document.participants.map(
      (participant) =>
        new ResearcherIdentityDto(
          participant.researcher,
          participant.participantCategory,
          participant.participantRole,
          participant.addedByFdpg,
          participant._id,
        ),
    );
    const responsibleResearcher = document.projectResponsible;
    if (
      responsibleResearcher &&
      !responsibleResearcher.projectResponsibility?.applicantIsProjectResponsible &&
      responsibleResearcher.researcher &&
      responsibleResearcher.researcher.email
    ) {
      researchers.push(
        new ResearcherIdentityDto(
          responsibleResearcher.researcher,
          responsibleResearcher.participantCategory,
          responsibleResearcher.participantRole,
          false,
          new Types.ObjectId().toString(),
        ),
      );
    }

    const tasks = researchers.map((researcher) => {
      if (researcher.email) {
        return this.keycloakService.getUsers({ email: researcher.email, exact: true });
      }
    });

    const results = await Promise.allSettled(tasks);

    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value && result.value.length > 0) {
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
      await this.proposalPdfService.createProposalPdf(saveResult, user);
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

  async getPdfProposalFile(proposalId: string, user: IRequestUser): Promise<Buffer> {
    const proposal = await this.proposalCrudService.findDocument(proposalId, user);
    return await this.proposalPdfService.getPdfProposalFile(proposal, user);
  }

  async setFdpgChecklist(
    proposalId: string,
    checklistUpdate: FdpgChecklistUpdateDto,
    user: IRequestUser,
  ): Promise<Partial<IChecklistItem> | null> {
    const toBeUpdated = await this.proposalCrudService.findDocument(proposalId, user, undefined, true);
    if (!toBeUpdated) throw new NotFoundException('Proposal not found');

    if (!toBeUpdated.fdpgChecklist) {
      toBeUpdated.fdpgChecklist = initChecklist();
    }

    updateFdpgChecklist(toBeUpdated, checklistUpdate);
    await toBeUpdated.save();

    // Return only the updated item
    if (checklistUpdate._id) {
      const targetFields = ['checkListVerification', 'projectProperties'] as const;

      for (const field of targetFields) {
        const items = toBeUpdated.fdpgChecklist[field];
        if (!items) continue;

        const updatedItem = items.find((item) => item._id.toString() === checklistUpdate._id?.toString());
        if (updatedItem) return updatedItem;
      }
    }

    // Handle special fields (checkbox or note update)
    if (checklistUpdate.isRegistrationLinkSent !== undefined) {
      return {
        _id: 'isRegistrationLinkSent',
        isRegistrationLinkSent: toBeUpdated.fdpgChecklist.isRegistrationLinkSent,
      } as any;
    }

    if (checklistUpdate.fdpgInternalCheckNotes !== undefined) {
      return {
        _id: 'fdpgInternalCheckNotes',
        fdpgInternalCheckNotes: toBeUpdated.fdpgChecklist.fdpgInternalCheckNotes,
      } as any;
    }

    return null;
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

    validateUpdateAdditionalInformationAccess(toBeUpdated, user);

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
    if (![Role.FdpgMember, Role.DataSourceMember].some((allowedRole) => user.singleKnownRole === allowedRole)) {
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

    if (changeList[DueDateEnum.DUE_DAYS_LOCATION_CHECK] !== undefined) {
      recalculateAllUacDelayStatus(proposal);
    }

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

  async getAllProposalFormVersions(): Promise<ProposalFormDto[]> {
    return await this.proposalFormService.findAll();
  }

  async addManualUploadCohort(
    proposalId: string,
    cohort: SelectedCohortUploadDto,
    file: Express.Multer.File,
    user: IRequestUser,
  ): Promise<{ insertedCohort: SelectedCohortDto; uploadedFile: UploadGetDto }> {
    const toBeUpdated = await this.proposalCrudService.findDocument(proposalId, user, undefined, true);
    validateModifyingCohortAccess(toBeUpdated, user);

    if (toBeUpdated.userProject.cohorts.selectedCohorts.length >= 49) {
      const errorInfo = new ValidationErrorInfo({
        constraint: 'Maximum cohorts reached',
        message: 'maximum cohorts reached',
        property: 'selectedCohorts',
        code: BadRequestError.MaximumCohortSizeReached,
      });
      throw new ValidationException([errorInfo]);
    }

    try {
      const blobName = getBlobName(toBeUpdated.id, UseCaseUpload.FeasibilityQuery);
      await this.storageService.uploadFile(blobName, file, user);
      const upload = new UploadDto(blobName, file, UseCaseUpload.FeasibilityQuery, user);

      addUpload(toBeUpdated, upload);

      const selectedCohort: SelectedCohort = {
        label: cohort.label,
        uploadId: upload._id,
        comment: cohort.comment,
        isManualUpload: true,
        feasibilityQueryId: undefined,
        numberOfPatients: cohort.numberOfPatients,
      };

      if (!toBeUpdated.userProject.cohorts.selectedCohorts) {
        toBeUpdated.userProject.cohorts.selectedCohorts = [];
      }

      toBeUpdated.userProject.cohorts.selectedCohorts.push(selectedCohort);

      const saved = await toBeUpdated.save();

      const insertedCohort = saved.userProject.cohorts?.selectedCohorts?.at(-1);
      const insertedUpload = saved.uploads?.at?.(-1);

      const cohortDto = plainToClass(SelectedCohortDto, JSON.parse(JSON.stringify(insertedCohort)), {
        strategy: 'excludeAll',
        groups: [ProposalValidation.IsOutput],
      });
      const uploadDto = plainToClass(UploadGetDto, JSON.parse(JSON.stringify(insertedUpload)), {
        strategy: 'excludeAll',
        groups: [ProposalValidation.IsOutput],
      });

      return { insertedCohort: cohortDto, uploadedFile: uploadDto };
    } catch (exception) {
      throw exception;
    }
  }

  async automaticCohortAdd(
    proposalId: string,
    cohort: AutomaticSelectedCohortUploadDto,
    user: IRequestUser,
  ): Promise<SelectedCohortDto> {
    const toBeUpdated = await this.proposalCrudService.findDocument(proposalId, user, undefined, true);

    validateModifyingCohortAccess(toBeUpdated, user);

    if (toBeUpdated.userProject.cohorts.selectedCohorts.length >= 49) {
      const errorInfo = new ValidationErrorInfo({
        constraint: 'Maximum cohorts reached',
        message: 'maximum cohorts reached',
        property: 'selectedCohorts',
        code: BadRequestError.MaximumCohortSizeReached,
      });
      throw new ValidationException([errorInfo]);
    }

    const selectedCohort: SelectedCohort = {
      label: cohort.label,
      uploadId: undefined,
      comment: cohort.comment,
      isManualUpload: false,
      feasibilityQueryId: cohort.feasibilityQueryId,
      numberOfPatients: cohort.numberOfPatients,
    };

    toBeUpdated.userProject.cohorts.selectedCohorts.push(selectedCohort);

    const saved = await toBeUpdated.save();

    const insertedCohort = saved.userProject.cohorts?.selectedCohorts?.at(-1);

    const cohortDto = plainToClass(SelectedCohortDto, JSON.parse(JSON.stringify(insertedCohort)), {
      strategy: 'excludeAll',
      groups: [ProposalValidation.IsOutput],
    });

    return cohortDto;
  }

  async deleteCohort(proposalId: string, cohortId: string, user: IRequestUser): Promise<SelectedCohortDto> {
    const toBeUpdated = await this.proposalCrudService.findDocument(proposalId, user, undefined, true);

    validateModifyingCohortAccess(toBeUpdated, user);

    const cohortIndex = toBeUpdated.userProject.cohorts?.selectedCohorts?.findIndex(
      (c) => c._id.toString() === cohortId,
    );

    if (cohortIndex === -1) {
      throw new NotFoundException('Cohort could not be found');
    }

    const cohort = toBeUpdated.userProject.cohorts?.selectedCohorts?.[cohortIndex];

    if (!cohort || cohort._id.toString() !== cohortId) {
      throw new NotFoundException('Cohort could not be found');
    }

    if (cohort.uploadId) {
      await this.uploadService.deleteUpload(toBeUpdated, cohort.uploadId, user);
    }

    toBeUpdated.userProject.cohorts?.selectedCohorts?.splice?.(cohortIndex, 1);

    await toBeUpdated.save();

    const deletedPlain = JSON.parse(JSON.stringify(cohort));
    return plainToClass(SelectedCohortDto, deletedPlain, {
      strategy: 'excludeAll',
      groups: [ProposalValidation.IsOutput],
    });
  }

  async getFeasibilityCsvByQueryId(proposalId: string, queryId: number, user: IRequestUser): Promise<any> {
    if (user.singleKnownRole === Role.Researcher) {
      const proposal = await this.proposalCrudService.find(proposalId, user);

      if (!proposal.userProject.cohorts.selectedCohorts.some((cohort) => cohort.feasibilityQueryId === queryId)) {
        throw new ForbiddenException('Cannot access cohort');
      }
    }

    const result = await this.feasibilityService.getQueryContentById(queryId, 'ZIP');

    return result;
  }

  async generateLocationCsv(proposalId: string, user: IRequestUser): Promise<Buffer> {
    const proposal = await this.proposalCrudService.findDocument(proposalId, user);

    const allLocations = new Set<MiiLocation>();

    proposal.openDizChecks?.forEach((loc) => allLocations.add(loc));
    proposal.dizApprovedLocations?.forEach((loc) => allLocations.add(loc));
    proposal.openDizConditionChecks?.forEach((loc) => allLocations.add(loc));
    proposal.uacApprovedLocations?.forEach((loc) => allLocations.add(loc));
    proposal.requestedButExcludedLocations?.forEach((loc) => allLocations.add(loc));
    proposal.signedContracts?.forEach((loc) => allLocations.add(loc));

    proposal.conditionalApprovals?.forEach((approval) => allLocations.add(approval.location));

    proposal.uacApprovals?.forEach((approval) => allLocations.add(approval.location));

    proposal.additionalLocationInformation?.forEach((info) => allLocations.add(info.location));

    const miiLocationMap = await this.miiLocationService.getAllLocationInfo();

    const headers = [
      'Rubrum',
      'Location Code',
      'Location Display Name',
      'Conditions',
      'Approval Status',
      'Publication Name',
      'Consent (Legal Basis)',
    ];

    const rows = await Promise.all(
      Array.from(allLocations).map(async (location) => {
        const conditionalApproval = proposal.conditionalApprovals?.find((approval) => approval.location === location);

        const additionalInfo = proposal.additionalLocationInformation?.find((info) => info.location === location);

        const miiLocationInfo = miiLocationMap.get(location);

        // Determine approval status
        let approvalStatus = '';
        if (proposal.uacApprovedLocations?.includes(location)) {
          approvalStatus = 'Approved';
        } else if (proposal.requestedButExcludedLocations?.includes(location)) {
          approvalStatus = 'Denied';
        } else if (proposal.openDizChecks?.includes(location)) {
          approvalStatus = 'Denied (No Response)';
        } else {
          approvalStatus = 'Unknown';
        }

        const conditions = conditionalApproval?.conditionReasoning
          ? convert(conditionalApproval.conditionReasoning, { wordwrap: false })
          : '';
        const publicationName = additionalInfo?.locationPublicationName || '';

        const consent = additionalInfo?.legalBasis ? 'true' : 'false';

        return [
          '', // Rubrum
          location, // Location Code
          miiLocationInfo?.display || location, // Location Display Name (fallback to code if not found)
          conditions, // Conditions
          approvalStatus, // Approval Status
          publicationName, // Publication Name
          consent, // Consent (Legal Basis)
        ];
      }),
    );

    // Convert to CSV format
    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    return Buffer.from(csvContent, 'utf-8');
  }

  async generateLocationCsvDownloadLink(
    proposalId: string,
    user: IRequestUser,
  ): Promise<{
    downloadUrl: string;
    filename: string;
    expiresAt: string;
  }> {
    const proposal = await this.proposalCrudService.findDocument(proposalId, user);

    const csvBuffer = await this.generateLocationCsv(proposalId, user);

    const filename = `location-contracting-info-${proposal.projectAbbreviation || proposalId}-${new Date().toISOString().split('T')[0]}.csv`;

    const tempFile: Express.Multer.File = {
      buffer: csvBuffer,
      originalname: filename,
      mimetype: 'text/plain',
      size: csvBuffer.length,
    } as Express.Multer.File;

    const blobName = `temp/csv-downloads/${proposalId}/${Date.now()}-${filename}`;

    await this.storageService.uploadFile(blobName, tempFile, user);

    // Generate a signed URL that expires in 1 hour
    const downloadUrl = await this.storageService.getSasUrl(blobName, true);

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    return {
      downloadUrl,
      filename,
      expiresAt,
    };
  }

  private canUpdateParticipants(proposal: any, user: IRequestUser): boolean {
    const isEditableStatus = proposal.status === ProposalStatus.Draft || proposal.status === ProposalStatus.FdpgCheck;
    const isFdpgMember = user.singleKnownRole === Role.FdpgMember;

    return isEditableStatus || isFdpgMember;
  }
  async updateParticipants(id: string, participants: Participant[], user: IRequestUser) {
    const proposal = await this.proposalCrudService.findDocument(id, user, undefined, true);

    if (!this.canUpdateParticipants(proposal, user)) {
      throw new ForbiddenException('Only FDPG members can update participants after draft/FDPG_CHECK status');
    }

    const oldParticipants = [...proposal.participants];

    const responsible = (participants || []).find(
      (p) => p?.participantRole?.role === ParticipantRoleType.ResponsibleScientist,
    );

    if (responsible) {
      const filteredParticipants = (participants || []).filter(
        (p) => p?.participantRole?.role !== ParticipantRoleType.ResponsibleScientist,
      );

      // If there is an existing projectResponsible, move them into participants
      const existingResponsible = proposal.projectResponsible;
      if (existingResponsible?.researcher) {
        const existsInFiltered = filteredParticipants.some(
          (p) => p?.researcher?.email?.toLowerCase?.() === existingResponsible?.researcher?.email?.toLowerCase?.(),
        );
        if (!existsInFiltered) {
          const toParticipant = {
            researcher: JSON.parse(JSON.stringify(existingResponsible.researcher)),
            institute: JSON.parse(JSON.stringify(existingResponsible.institute)),
            participantCategory: JSON.parse(JSON.stringify(existingResponsible.participantCategory)),
            participantRole: JSON.parse(JSON.stringify(existingResponsible.participantRole)),
            addedByFdpg: existingResponsible.addedByFdpg,
          } as any;
          toParticipant.participantRole.role = ParticipantRoleType.ParticipatingScientist;
          filteredParticipants.push(toParticipant);
        }
      }

      const newProjectResponsible = {
        // Preserve existing projectResponsibility flags/settings
        projectResponsibility: proposal.projectResponsible?.projectResponsibility
          ? JSON.parse(JSON.stringify(proposal.projectResponsible.projectResponsibility))
          : undefined,
        researcher: JSON.parse(JSON.stringify(responsible?.researcher)),
        institute: JSON.parse(JSON.stringify(responsible?.institute)),
        participantCategory: JSON.parse(JSON.stringify(responsible?.participantCategory)),
        participantRole: JSON.parse(JSON.stringify(responsible?.participantRole)),
        addedByFdpg: true,
      } as any;

      mergeDeep(proposal, { participants: filteredParticipants, projectResponsible: newProjectResponsible });
    } else {
      mergeDeep(proposal, { participants });
    }

    // Compare old participants with the actual merged state
    addHistoryItemForParticipantsUpdated(proposal, user, oldParticipants, proposal.participants);

    const savedProposal = await proposal.save();
    return plainToClass(ProposalGetDto, savedProposal.toObject(), {
      strategy: 'excludeAll',
      groups: [ProposalValidation.IsOutput],
    });
  }
  async removeParticipant(id: string, participantId: string, user: IRequestUser): Promise<ProposalGetDto> {
    const proposal = await this.proposalCrudService.findDocument(id, user, undefined, true);

    if (!this.canUpdateParticipants(proposal, user)) {
      throw new ForbiddenException('Only FDPG members can remove participants after draft/FDPG_CHECK status');
    }

    const participantIndex = proposal.participants.findIndex((p) => p._id.toString() === participantId);
    if (participantIndex === -1) {
      throw new NotFoundException('Participant not found');
    }

    const removedParticipant = proposal.participants[participantIndex];
    proposal.participants.splice(participantIndex, 1);

    addHistoryItemForParticipantRemoved(proposal, user, removedParticipant);

    const savedProposal = await proposal.save();
    return plainToClass(ProposalGetDto, savedProposal.toObject(), {
      strategy: 'excludeAll',
      groups: [ProposalValidation.IsOutput],
    });
  }
  async createDizDetails(
    proposalId: string,
    createDto: DizDetailsCreateDto,
    user: IRequestUser,
  ): Promise<DizDetailsGetDto> {
    const proposal = await this.proposalCrudService.findDocument(proposalId, user);

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    validateProposalAccess(proposal, user, true);

    // Only DIZ members can create DIZ details
    if (user.singleKnownRole !== Role.DizMember) {
      throw new ForbiddenException('Only DIZ members can create DIZ details');
    }

    // Check if DIZ details already exist for this location
    const existingDizDetail = proposal.dizDetails.find((detail) => detail.location === user.miiLocation);

    if (existingDizDetail) {
      throw new ConflictException('DIZ details already exist for this location');
    }

    const newDizDetail = {
      location: user.miiLocation,
      localProjectIdentifier: createDto.localProjectIdentifier,
      documentationLinks: createDto.documentationLinks,
    };

    proposal.dizDetails.push(newDizDetail as any);
    const savedProposal = await proposal.save();

    const createdDizDetail = savedProposal.dizDetails[savedProposal.dizDetails.length - 1];

    return plainToClass(DizDetailsGetDto, createdDizDetail, {
      strategy: 'excludeAll',
      groups: [ProposalValidation.IsOutput],
    });
  }

  async updateDizDetails(
    proposalId: string,
    dizDetailsId: string,
    updateDto: DizDetailsUpdateDto,
    user: IRequestUser,
  ): Promise<DizDetailsGetDto> {
    const proposal = await this.proposalCrudService.findDocument(proposalId, user);

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    validateProposalAccess(proposal, user, true);

    // Only DIZ members can update DIZ details
    if (user.singleKnownRole !== Role.DizMember) {
      throw new ForbiddenException('Only DIZ members can update DIZ details');
    }

    const dizDetailIndex = proposal.dizDetails.findIndex(
      (detail) => detail._id.toString() === dizDetailsId && detail.location === user.miiLocation,
    );

    if (dizDetailIndex === -1) {
      throw new NotFoundException('DIZ details not found for this location');
    }

    proposal.dizDetails[dizDetailIndex].localProjectIdentifier = updateDto.localProjectIdentifier;
    proposal.dizDetails[dizDetailIndex].documentationLinks = updateDto.documentationLinks;

    await proposal.save();

    return plainToClass(DizDetailsGetDto, proposal.dizDetails[dizDetailIndex], {
      strategy: 'excludeAll',
      groups: [ProposalValidation.IsOutput],
    });
  }
}
