import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { plainToClass } from 'class-transformer';
import { Model } from 'mongoose';
import { SharedService } from 'src/shared/shared.service';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import { getOwner } from 'src/shared/utils/get-owner.util';
import { convertUserToGroups } from 'src/shared/utils/user-group.utils';
import { validateMatchingId } from 'src/shared/utils/validate-matching-ids.util';
import { SortOrderDto } from '../../../shared/dto/sort-order.dto';
import { EventEngineService } from '../../event-engine/event-engine.service';
import { ProposalCreateDto, ProposalGetDto, ProposalGetListDto, ProposalUpdateDto } from '../dto/proposal/proposal.dto';
import { PanelQuery } from '../enums/panel-query.enum';
import { ProposalValidation } from '../enums/porposal-validation.enum';
import { ProposalStatus } from '../enums/proposal-status.enum';
import { GetListProjection } from '../schema/constants/get-list.projection';
import { Proposal, ProposalDocument } from '../schema/proposal.schema';
import { StatusChangeService } from './status-change.service';
import { IProposalGetListSchema } from '../types/proposal-get-list-schema.interface';
import { mergeProposal } from '../utils/merge-proposal.util';
import { getProposalFilter } from '../utils/proposal-filter/proposal-filter.util';
import { addHistoryItemForStatus } from '../utils/proposal-history.util';
import { validateProposalAccess } from '../utils/validate-access.util';
import { validateStatusChange } from '../utils/validate-status-change.util';
import { CheckUniqueProposalDto } from '../dto/check-unique-proposal.dto';
import { Role } from 'src/shared/enums/role.enum';
import { ProposalFormService } from 'src/modules/proposal-form/proposal-form.service';
import { PlatformIdentifier } from '../../admin/enums/platform-identifier.enum';
import { generateDataSourceLocaleId } from '../utils/generate-data-source-locale-id.util';

@Injectable()
export class ProposalCrudService {
  constructor(
    @InjectModel(Proposal.name)
    private proposalModel: Model<ProposalDocument>,
    private eventEngineService: EventEngineService,
    private sharedService: SharedService,
    private statusChangeService: StatusChangeService,
    private proposalFormService: ProposalFormService,
  ) {}

  async create(createProposalDto: ProposalCreateDto, user: IRequestUser): Promise<ProposalGetDto> {
    const createdProposal = new this.proposalModel(createProposalDto) as ProposalDocument;
    createdProposal.version = { mayor: 0, minor: 0 };
    createdProposal.ownerId = user.userId;
    createdProposal.ownerName = user.fullName;
    createdProposal.owner = getOwner(user);
    createdProposal.formVersion = await this.proposalFormService.getCurrentVersion();

    // Generate DIFE ID if DIFE is selected as a data source
    if (createdProposal.selectedDataSources?.includes(PlatformIdentifier.DIFE)) {
      createdProposal.dataSourceLocaleId = await generateDataSourceLocaleId(this.proposalModel);
    }

    addHistoryItemForStatus(createdProposal, user);
    await this.statusChangeService.handleEffects(createdProposal, null, user);

    const saveResult = await createdProposal.save();
    if (saveResult.status !== ProposalStatus.Draft) {
      await this.eventEngineService.handleProposalStatusChange(saveResult);
    }

    const plain = saveResult.toObject();
    this.addParticipatingScientistIndicator(plain, user);
    return plainToClass(ProposalGetDto, plain, { strategy: 'excludeAll', groups: [ProposalValidation.IsOutput] });
  }

  async findDocument(
    proposalId: string,
    user: IRequestUser,
    projection?: Record<string, number>,
    willBeModified?: boolean,
  ): Promise<ProposalDocument> {
    const dbProjection: Record<string, number> = {
      ...projection,
    };

    if (projection === undefined) {
      dbProjection['reports.content'] = 0;
    } else if (user.singleKnownRole === Role.DizMember) {
      dbProjection.owner = 1;
      dbProjection.projectResponsible = 1;
      dbProjection.locationConditionDraft = 1;
      dbProjection.conditionalApprovals = 1;
      dbProjection.openDizChecks = 1;
      dbProjection.dizApprovedLocations = 1;
      dbProjection.openDizConditionChecks = 1;
      dbProjection.uacApprovedLocations = 1;
      dbProjection.signedContracts = 1;
      dbProjection.requestedButExcludedLocations = 1;
      dbProjection.additionalLocationInformation = 1;
    } else if (user.singleKnownRole === Role.UacMember) {
      dbProjection.owner = 1;
      dbProjection.projectResponsible = 1;
      dbProjection.locationConditionDraft = 1;
      dbProjection.conditionalApprovals = 1;
      dbProjection.dizApprovedLocations = 1;
      dbProjection.openDizConditionChecks = 1;
      dbProjection.uacApprovedLocations = 1;
      dbProjection.signedContracts = 1;
      dbProjection.requestedButExcludedLocations = 1;
      dbProjection.additionalLocationInformation = 1;
    } else {
      dbProjection.owner = 1;
      dbProjection.projectResponsible = 1;
      dbProjection.participants = 1;
      dbProjection.deadlines = 1;
      dbProjection.selectedDataSources = 1;
    }
    const proposal = await this.proposalModel.findById(proposalId, dbProjection);

    if (proposal) {
      validateProposalAccess(proposal, user, willBeModified);
      return proposal;
    } else {
      throw new NotFoundException();
    }
  }

  async find(proposalId: string, user: IRequestUser): Promise<ProposalGetDto> {
    const document = await this.findDocument(proposalId, user);
    const plain = document.toObject();
    this.addParticipatingScientistIndicator(plain, user);
    const userGroups = convertUserToGroups(user);

    const result = plainToClass(ProposalGetDto, plain, {
      strategy: 'excludeAll',
      groups: [...userGroups, ProposalValidation.IsOutput, user.singleKnownRole],
    });

    return result;
  }

  async findAll(sortOrder: SortOrderDto, panelQuery: PanelQuery, user: IRequestUser): Promise<ProposalGetListDto[]> {
    const filter = getProposalFilter(panelQuery, user);
    const results = await this.proposalModel.find(filter, null, {
      sort: {
        [sortOrder.sortBy ?? '_id']: sortOrder.order ?? 1,
      },
      projection: GetListProjection,
    });

    return results.map((result: unknown) => new ProposalGetListDto(result as IProposalGetListSchema, user));
  }

  async update(proposalId: string, updateProposalDto: ProposalUpdateDto, user: IRequestUser): Promise<ProposalGetDto> {
    validateMatchingId(proposalId, updateProposalDto._id);

    const toBeUpdated = await this.findDocument(proposalId, user, undefined, true);
    const oldStatus = toBeUpdated.status;
    const isStatusChange = updateProposalDto.status !== oldStatus;

    if (isStatusChange) {
      validateStatusChange(toBeUpdated, updateProposalDto.status, user);
    }

    mergeProposal(toBeUpdated, updateProposalDto);

    // Handle DIFE dataSourceLocaleId
    if (toBeUpdated.selectedDataSources?.includes(PlatformIdentifier.DIFE)) {
      if (!toBeUpdated.dataSourceLocaleId) {
        toBeUpdated.dataSourceLocaleId = await generateDataSourceLocaleId(this.proposalModel);
      }
    } else if (toBeUpdated.dataSourceLocaleId?.startsWith('DIFE_')) {
      toBeUpdated.dataSourceLocaleId = undefined;
    }

    await this.statusChangeService.handleEffects(toBeUpdated, oldStatus, user);
    addHistoryItemForStatus(toBeUpdated, user, oldStatus);

    const saveResult = await toBeUpdated.save();

    if (isStatusChange) {
      await this.eventEngineService.handleProposalStatusChange(saveResult);
    }

    const plain = saveResult.toObject();

    this.addParticipatingScientistIndicator(plain, user);
    return plainToClass(ProposalGetDto, plain, { strategy: 'excludeAll', groups: [ProposalValidation.IsOutput] });
  }

  async delete(proposalId: string, user: IRequestUser): Promise<void> {
    const document = await this.findDocument(proposalId, user, { uploads: 1, reports: 1, owner: 1, status: 1 }, true);
    await this.sharedService.deleteProposalWithDependencies(document, user);
  }

  async duplicate(proposalId: string, user: IRequestUser): Promise<ProposalGetDto> {
    const proposal = await this.findDocument(proposalId, user);
    proposal.status = ProposalStatus.Draft;
    const plain = proposal.toObject();
    const toBeSaved = plainToClass(ProposalCreateDto, plain, { strategy: 'excludeAll' });

    // Determine duplicate number
    let i = 0;

    do {
      i++;
    } while (
      !(await this.checkUnique({
        projectAbbreviation: `${proposal.projectAbbreviation}-Copy(${i})`,
      }))
    );

    toBeSaved.projectAbbreviation = `${proposal.projectAbbreviation}-Copy(${i})`;

    return this.create(toBeSaved, user);
  }

  async checkUnique(checkUniqueProposalDto: CheckUniqueProposalDto, id?: string): Promise<boolean> {
    const queryFilter: Partial<Record<keyof Proposal, any>> = {
      ...checkUniqueProposalDto,
    };
    if (id) {
      queryFilter._id = { $ne: id };
    }
    const exists = await this.proposalModel.exists(queryFilter);
    return !exists;
  }

  private addParticipatingScientistIndicator(plain: any, user: IRequestUser) {
    plain.isParticipatingScientist =
      (plain.participants || []).filter((participant) => participant.researcher.email === user.email).length > 0 ||
      plain.projectResponsible?.researcher?.email === user.email;
  }
}
