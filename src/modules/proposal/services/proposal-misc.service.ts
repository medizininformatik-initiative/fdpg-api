import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as JSZip from 'jszip';
import { Types } from 'mongoose';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import { findByKeyNested } from 'src/shared/utils/find-by-key-nested.util';
import { EventEngineService } from '../../event-engine/event-engine.service';
import { KeycloakService } from '../../user/keycloak.service';
import { FdpgChecklistSetDto, FdpgChecklistUpdateDto, initChecklist } from '../dto/proposal/fdpg-checklist.dto';
import { ResearcherIdentityDto } from '../dto/proposal/participants/researcher.dto';
import { ProposalStatus } from '../enums/proposal-status.enum';
import { ProposalType } from '../enums/proposal-type.enum';
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
import { IChecklist, IChecklistItem } from '../dto/proposal/checklist.types';
import { ProposalFormService } from 'src/modules/proposal-form/proposal-form.service';
import { ProposalFormDto } from 'src/modules/proposal-form/dto/proposal-form.dto';
import { ProposalPdfService } from './proposal-pdf.service';
import { ProposalValidation } from '../enums/porposal-validation.enum';
import { plainToClass } from 'class-transformer';
import { UseCaseUpload } from '../enums/upload-type.enum';
import { addUpload, getBlobName } from '../utils/proposal.utils';
import { UploadDto, UploadGetDto } from '../dto/upload.dto';
import { StorageService } from 'src/modules/storage/storage.service';
import { ProposalDownloadService } from './proposal-download.service';
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
import { ParticipantRoleType } from '../enums/participant-role-type.enum';
import { Participant } from '../schema/sub-schema/participant.schema';
import { mergeDeep } from '../utils/merge-proposal.util';
import { ProjectResponsible } from '../schema/sub-schema/project-responsible.schema';
import { DizDetailsCreateDto, DizDetailsGetDto, DizDetailsUpdateDto } from '../dto/proposal/diz-details.dto';
import { ConflictException } from '@nestjs/common';
import { recalculateAllUacDelayStatus } from '../utils/uac-delay-tracking.util';
import { convert } from 'html-to-text';
import { CsvDownloadResponseDto } from '../dto/csv-download.dto';
import { ParticipantRole } from '../schema/sub-schema/participants/participant-role.schema';
import { Proposal, ProposalDocument } from '../schema/proposal.schema';
import { ApplicantDto } from '../dto/proposal/applicant.dto';
import { LocationService } from 'src/modules/location/service/location.service';
import { FdpgChecklist } from '../schema/sub-schema/fdpg-checklist.schema';

@Injectable()
export class ProposalMiscService {
  constructor(
    @InjectModel(Proposal.name)
    private proposalModel: Model<ProposalDocument>,
    private proposalCrudService: ProposalCrudService,
    private eventEngineService: EventEngineService,
    private statusChangeService: StatusChangeService,
    private keycloakService: KeycloakService,
    private schedulerService: SchedulerService,
    private proposalPdfService: ProposalPdfService,
    private proposalFormService: ProposalFormService,
    private storageService: StorageService,
    private proposalDownloadService: ProposalDownloadService,
    private uploadService: ProposalUploadService,
    private feasibilityService: FeasibilityService,
    private locationService: LocationService,
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
    if (responsibleResearcher) {
      if (responsibleResearcher.researcher && responsibleResearcher.researcher.email) {
        // Case: applicantIsProjectResponsible is false - projectResponsible has researcher data
        researchers.push(
          new ResearcherIdentityDto(
            responsibleResearcher.researcher,
            responsibleResearcher.participantCategory,
            responsibleResearcher.participantRole,
            false,
            'responsibleResearcherId', // dummy id to keep api design consistent
          ),
        );
        // applicant will be listed as editor (only if applicantIsProjectResponsible is false)
        if (!responsibleResearcher.projectResponsibility?.applicantIsProjectResponsible) {
          researchers.push(
            new ResearcherIdentityDto(
              document.applicant.researcher,
              document.applicant.participantCategory,
              {
                role: ParticipantRoleType.Researcher,
              } as ParticipantRole,
              false,
              'applicantId', // dummy id to keep api design consistent
            ),
          );
        }
      } else if (
        responsibleResearcher.projectResponsibility?.applicantIsProjectResponsible &&
        document.applicant?.researcher?.email
      ) {
        // Case: applicantIsProjectResponsible is true - use applicant data with RESPONSIBLE_SCIENTIST role
        researchers.push(
          new ResearcherIdentityDto(
            document.applicant.researcher,
            document.applicant.participantCategory,
            {
              role: ParticipantRoleType.ResponsibleScientist, // Applicant is responsible scientist
            } as ParticipantRole,
            false,
            'applicantId', // Use applicantId since the applicant is the responsible scientist
          ),
        );
      }
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
          if (
            researcher.email &&
            result.value[0].email &&
            researcher.email.toLocaleLowerCase() === result.value[0].email.toLocaleLowerCase()
          ) {
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

    if (checklistUpdate.initialViewing !== undefined) {
      return {
        _id: 'initialViewing',
        initialViewing: toBeUpdated.fdpgChecklist.initialViewing,
      } as any;
    }

    if (checklistUpdate.depthCheck !== undefined) {
      return {
        _id: 'depthCheck',
        depthCheck: toBeUpdated.fdpgChecklist.depthCheck,
      } as any;
    }

    if (checklistUpdate.ethicsCheck !== undefined) {
      return {
        _id: 'ethicsCheck',
        ethicsCheck: toBeUpdated.fdpgChecklist.ethicsCheck,
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

    const updatedDeadlines: Record<DueDateEnum, Date | null> = { ...proposal.deadlines, ...deadlines };

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

    const allLocations = new Set<string>();

    proposal.openDizChecks?.forEach((loc) => allLocations.add(loc));
    proposal.dizApprovedLocations?.forEach((loc) => allLocations.add(loc));
    proposal.openDizConditionChecks?.forEach((loc) => allLocations.add(loc));
    proposal.uacApprovedLocations?.forEach((loc) => allLocations.add(loc));
    proposal.requestedButExcludedLocations?.forEach((loc) => allLocations.add(loc));
    proposal.signedContracts?.forEach((loc) => allLocations.add(loc));

    proposal.conditionalApprovals?.forEach((approval) => allLocations.add(approval.location));

    proposal.uacApprovals?.forEach((approval) => allLocations.add(approval.location));

    proposal.additionalLocationInformation?.forEach((info) => allLocations.add(info.location));

    const locations = await this.locationService.findAll();

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

        const persistedLocation = locations.find((loc) => loc._id === location);

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
          persistedLocation?.rubrum ?? '', // Rubrum
          location, // Location Code
          persistedLocation?.display ?? '',
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

  async generateLocationCsvDownloadLink(proposalId: string, user: IRequestUser): Promise<CsvDownloadResponseDto> {
    const proposal = await this.proposalCrudService.findDocument(proposalId, user);

    const csvBuffer = await this.generateLocationCsv(proposalId, user);

    const filename = `${new Date().toISOString().split('T')[0]}-location-contracting-info-${proposal.projectAbbreviation}.csv`;

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

    return { downloadUrl, filename, expiresAt };
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
        projectResponsibility: proposal.projectResponsible?.projectResponsibility
          ? {
              ...JSON.parse(JSON.stringify(proposal.projectResponsible.projectResponsibility)),
              applicantIsProjectResponsible: false,
            }
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
  async exportAllUploadsAsZip(
    proposalId: string,
    user: IRequestUser,
  ): Promise<{ zipBuffer: Buffer; projectAbbreviation: string }> {
    const proposal = await this.proposalCrudService.findDocument(proposalId, user, {
      uploads: 1,
      projectAbbreviation: 1,
    });

    if (!proposal.uploads || proposal.uploads.length === 0) {
      throw new NotFoundException('No uploads found for this proposal');
    }

    if (!proposal.projectAbbreviation) {
      throw new NotFoundException('Project abbreviation not found for this proposal');
    }

    const zip = new JSZip();

    const excludedTypes: string[] = [
      UseCaseUpload.ContractCondition,
      UseCaseUpload.LocationContract,
      UseCaseUpload.ResearcherContract,
      UseCaseUpload.ContractDraft,
    ];
    const filteredUploads = proposal.uploads.filter((upload) => !excludedTypes.includes(upload.type));

    if (filteredUploads.length === 0) {
      throw new NotFoundException('No exportable uploads found for this proposal');
    }

    const downloadPromises = filteredUploads.map(async (upload) => {
      try {
        const fileBuffer = await this.proposalDownloadService.downloadFile(upload.blobName);
        const fileName = upload.fileName || `upload_${upload._id}`;
        zip.file(fileName, fileBuffer);
        return { success: true, fileName };
      } catch (error) {
        console.warn(`Skipping missing file ${upload.blobName}:`, error.message);
        return { success: false, fileName: upload.fileName || `upload_${upload._id}`, error: error.message };
      }
    });

    const results = await Promise.allSettled(downloadPromises);
    const successful = results.filter((result) => result.status === 'fulfilled' && result.value.success).length;
    const failed = results.filter(
      (result) => result.status === 'rejected' || (result.status === 'fulfilled' && !result.value.success),
    ).length;

    console.log(`Zip creation summary: ${successful} files added, ${failed} files skipped for proposal ${proposalId}.`);
    if (successful === 0) {
      throw new NotFoundException('No accessible files found for this proposal');
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    return { zipBuffer, projectAbbreviation: proposal.projectAbbreviation };
  }

  async copyAsInternalRegistration(proposalId: string, user: IRequestUser): Promise<string> {
    const original = await this.proposalCrudService.findDocument(proposalId, user);

    const validStatuses = [
      ProposalStatus.Contracting,
      ProposalStatus.ExpectDataDelivery,
      ProposalStatus.DataResearch,
      ProposalStatus.DataCorrupt,
      ProposalStatus.FinishedProject,
    ];

    if (!validStatuses.includes(original.status)) {
      throw new BadRequestException('Proposal must be in Contracting or later status to register');
    }

    const originalObj = original.toObject();

    this.resetIsDoneFlags(originalObj);

    // If applicant is also the responsible scientist, copy their data to projectResponsible
    let projectResponsible = originalObj.projectResponsible;
    if (originalObj.projectResponsible?.projectResponsibility?.applicantIsProjectResponsible && originalObj.applicant) {
      // When applicantIsProjectResponsible is true, copy applicant data to projectResponsible
      projectResponsible = {
        ...originalObj.projectResponsible,
        researcher: originalObj.applicant.researcher,
        institute: originalObj.applicant.institute,
        participantCategory: originalObj.applicant.participantCategory,
        // Keep the projectResponsibility but set applicantIsProjectResponsible to false for the registration
        projectResponsibility: {
          ...originalObj.projectResponsible.projectResponsibility,
          applicantIsProjectResponsible: false,
        },
      };
    }

    let newAbbreviation = `${original.projectAbbreviation}-REG`;
    let suffix = 1;

    while (await this.proposalModel.findOne({ projectAbbreviation: newAbbreviation })) {
      newAbbreviation = `${original.projectAbbreviation}-REG${suffix}`;
      suffix++;
    }

    const copyData = {
      ...originalObj,
      _id: undefined,
      projectAbbreviation: newAbbreviation,
      dataSourceLocaleId: undefined, // Clear DIFE ID - not needed for registration and must be unique
      type: ProposalType.RegisteringForm,
      registerInfo: {
        isInternalRegistration: true,
        originalProposalId: original._id.toString(),
        originalProposalStatus: original.status,
      },
      status: ProposalStatus.Draft,
      owner: originalObj.owner,
      ownerId: originalObj.ownerId,
      ownerName: originalObj.ownerName,
      applicant: originalObj.applicant,
      projectResponsible: projectResponsible,
      participants: originalObj.participants,
      history: [
        {
          status: ProposalStatus.Draft,
          timestamp: new Date(),
          user: {
            id: user.userId,
            name: user.username,
          },
          comment: `Copied from proposal ${original.projectAbbreviation} for internal registration by FDPG`,
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
      version: { mayor: 0, minor: 0 },
    };

    const newProposal = new this.proposalModel(copyData);
    const formVersion = await this.proposalFormService.getCurrentVersion();
    newProposal.formVersion = formVersion;

    await this.statusChangeService.handleEffects(newProposal, null, user);
    const saveResult = await newProposal.save();
    original.registerFormId = saveResult._id.toString();
    await original.save();
    return saveResult._id.toString();
  }

  private resetIsDoneFlags(proposal: any): void {
    const resetInObject = (obj: any) => {
      if (!obj || typeof obj !== 'object') return;

      if (Array.isArray(obj)) {
        obj.forEach((item) => resetInObject(item));
        return;
      }

      if ('isDone' in obj) {
        obj.isDone = false;
      }

      Object.values(obj).forEach((value) => {
        if (value && typeof value === 'object') {
          resetInObject(value);
        }
      });
    };

    resetInObject(proposal);
  }
  async updateApplicantParticipantRole(
    proposalId: string,
    updateDto: ApplicantDto,
    user: IRequestUser,
  ): Promise<ProposalGetDto> {
    const proposal = await this.proposalCrudService.findDocument(proposalId, user, undefined, true);

    if (!this.canUpdateApplicantParticipantRole(proposal, user)) {
      throw new ForbiddenException('You do not have permission to update applicant participant role');
    }

    const isBecomingResponsibleScientist = updateDto.participantRole?.role === ParticipantRoleType.ResponsibleScientist;

    if (proposal.applicant && updateDto.participantRole) {
      proposal.applicant.participantRole = {
        role: updateDto.participantRole.role,
        isDone: false,
      } as ParticipantRole;

      if (isBecomingResponsibleScientist) {
        // Applicant is becoming responsible scientist
        // Store former responsible scientist data
        const formerResponsibleScientist = proposal.projectResponsible?.researcher
          ? {
              researcher: proposal.projectResponsible.researcher,
              institute: proposal.projectResponsible.institute,
              participantCategory: proposal.projectResponsible.participantCategory,
              addedByFdpg: proposal.projectResponsible.addedByFdpg || false,
            }
          : null;

        proposal.projectResponsible = {
          researcher: null,
          institute: null,
          participantCategory: null,
          participantRole: null,
          projectResponsibility: {
            _id: proposal.projectResponsible?.projectResponsibility?._id,
            applicantIsProjectResponsible: true,
            isDone: false,
          },
          addedByFdpg: false,
        };

        // If there was a former responsible scientist, move them to participants array
        this.addFormerResponsibleToParticipants(proposal, formerResponsibleScientist);

        if (proposal.participants) {
          proposal.participants.forEach((participant) => {
            if (participant.participantRole?.role === ParticipantRoleType.ResponsibleScientist) {
              participant.participantRole.role = ParticipantRoleType.ParticipatingScientist;
              participant.participantRole.isDone = false;
            }
          });
        }
      } else {
        // Applicant is becoming editor (RESEARCHER) - someone else must be responsible
        // Set applicantIsProjectResponsible to false
        if (proposal.projectResponsible?.projectResponsibility) {
          proposal.projectResponsible.projectResponsibility.applicantIsProjectResponsible = false;
        }
      }
    }

    // Add history item for the change
    addHistoryItemForParticipantsUpdated(proposal, user, proposal.participants, proposal.participants);

    const savedProposal = await proposal.save();
    return plainToClass(ProposalGetDto, savedProposal.toObject(), {
      strategy: 'excludeAll',
      groups: [ProposalValidation.IsOutput],
    });
  }

  async makeParticipantResponsible(
    proposalId: string,
    participantId: string,
    user: IRequestUser,
  ): Promise<ProposalGetDto> {
    const proposal = await this.proposalCrudService.findDocument(proposalId, user, undefined, true);

    if (!this.canUpdateApplicantParticipantRole(proposal, user)) {
      throw new ForbiddenException('You do not have permission to change the responsible scientist');
    }

    const participantIndex = proposal.participants.findIndex((p) => p._id.toString() === participantId);

    if (participantIndex === -1) {
      throw new NotFoundException('Participant not found');
    }

    const newResponsible = proposal.participants[participantIndex];

    const applicantWasResponsible = proposal.projectResponsible?.projectResponsibility?.applicantIsProjectResponsible;

    // Store former responsible scientist data if exists (and not applicant)
    const formerResponsibleScientist =
      proposal.projectResponsible?.researcher && !applicantWasResponsible
        ? {
            researcher: proposal.projectResponsible.researcher,
            institute: proposal.projectResponsible.institute,
            participantCategory: proposal.projectResponsible.participantCategory,
            addedByFdpg: proposal.projectResponsible.addedByFdpg || false,
          }
        : null;

    // Set the new responsible scientist in projectResponsible
    proposal.projectResponsible = {
      researcher: newResponsible.researcher,
      institute: newResponsible.institute,
      participantCategory: newResponsible.participantCategory,
      participantRole: {
        _id: newResponsible.participantRole._id || new Types.ObjectId().toString(),
        role: ParticipantRoleType.ResponsibleScientist,
        isDone: false,
      },
      projectResponsibility: {
        _id: proposal.projectResponsible?.projectResponsibility?._id,
        applicantIsProjectResponsible: false,
        isDone: false,
      },
      addedByFdpg: newResponsible.addedByFdpg || false,
    };

    proposal.participants.splice(participantIndex, 1);

    // If there was a former responsible scientist (not applicant), add them to participants
    this.addFormerResponsibleToParticipants(proposal, formerResponsibleScientist);

    // If applicant was the responsible scientist, change their role to RESEARCHER (editor)
    if (applicantWasResponsible && proposal.applicant?.participantRole) {
      proposal.applicant.participantRole.role = ParticipantRoleType.Researcher;
      proposal.applicant.participantRole.isDone = false;
    }

    // Add history item for the change
    addHistoryItemForParticipantsUpdated(proposal, user, proposal.participants, proposal.participants);

    const savedProposal = await proposal.save();
    return plainToClass(ProposalGetDto, savedProposal.toObject(), {
      strategy: 'excludeAll',
      groups: [ProposalValidation.IsOutput],
    });
  }

  private canUpdateApplicantParticipantRole(proposal: any, user: IRequestUser): boolean {
    // Allow FDPG members and DataSource members to update applicant participant role
    if ([Role.FdpgMember, Role.DataSourceMember].includes(user.singleKnownRole)) {
      return true;
    }

    // Allow researchers to update their own proposal if it's in draft/FDPG_CHECK/Rework status
    if (
      user.singleKnownRole === Role.Researcher &&
      (proposal.status === ProposalStatus.Draft ||
        proposal.status === ProposalStatus.FdpgCheck ||
        proposal.status === ProposalStatus.Rework)
    ) {
      return true;
    }

    return false;
  }

  private addFormerResponsibleToParticipants(
    proposal: ProposalDocument,
    formerResponsibleScientist: Pick<
      ProjectResponsible,
      'researcher' | 'institute' | 'participantCategory' | 'addedByFdpg'
    > | null,
  ): void {
    if (formerResponsibleScientist && formerResponsibleScientist.researcher?.email) {
      const alreadyExists = proposal.participants.some(
        (p) => p.researcher?.email?.toLowerCase() === formerResponsibleScientist.researcher.email.toLowerCase(),
      );

      if (!alreadyExists) {
        proposal.participants.push({
          _id: undefined,
          researcher: formerResponsibleScientist.researcher,
          institute: formerResponsibleScientist.institute,
          participantCategory: formerResponsibleScientist.participantCategory,
          participantRole: {
            _id: undefined,
            role: ParticipantRoleType.ParticipatingScientist,
            isDone: false,
          },
          addedByFdpg: formerResponsibleScientist.addedByFdpg,
        });
      }
    }
  }
}
