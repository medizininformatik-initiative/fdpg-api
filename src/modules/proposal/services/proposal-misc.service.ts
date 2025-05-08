import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { IRequestUser } from 'src/shared/types/request-user.interface';
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
    return await this.proposalPdfService.getPdfProposalFile(proposal);
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

    updateFdpgChecklist(toBeUpdated, checklistUpdate, user.fullName);
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

  async getAllProposalFormVersions(): Promise<ProposalFormDto[]> {
    return await this.proposalFormService.findAll();
  }
}
