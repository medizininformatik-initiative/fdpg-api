import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { ValidationException } from 'src/exceptions/validation/validation.exception';
import { MiiLocation } from 'src/shared/constants/mii-locations';
import { ValidationErrorInfo } from 'src/shared/dto/validation/validation-error-info.dto';
import { BadRequestError } from 'src/shared/enums/bad-request-error.enum';
import { Role } from 'src/shared/enums/role.enum';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import { convertUserToGroups } from 'src/shared/utils/user-group.utils';
import { EventEngineService } from '../../event-engine/event-engine.service';
import { StorageService } from '../../storage/storage.service';
import { InitContractingDto } from '../dto/proposal/init-contracting.dto';
import { ProposalMarkConditionAcceptedReturnDto } from '../dto/proposal/proposal.dto';
import { SetDizApprovalDto } from '../dto/set-diz-approval.dto';
import { SetUacApprovalDto } from '../dto/set-uac-approval.dto';
import { SignContractDto } from '../dto/sign-contract.dto';
import { UploadDto } from '../dto/upload.dto';
import { ProposalValidation } from '../enums/porposal-validation.enum';
import { ProposalStatus } from '../enums/proposal-status.enum';
import { UseCaseUpload } from '../enums/upload-type.enum';
import { addContractSign } from '../utils/add-contract-sign.util';
import {
  addDizApproval,
  addUacApprovalWithCondition,
  addDizConditionReview,
  addDizConditionApproval,
  addDizApprovalWithCondition,
} from '../utils/add-location-vote.util';
import {
  addHistoryItemForContractSign,
  addHistoryItemForDizApproval,
  addHistoryItemForDizConditionReviewApproval,
  addHistoryItemForRevertLocationVote,
  addHistoryItemForStatus,
  addHistoryItemForUacApproval,
  addHistoryItemForUacCondition,
  addHistoryItemForContractUpdate,
} from '../utils/proposal-history.util';
import { addUpload, getBlobName } from '../utils/proposal.utils';
import { revertLocationVote } from '../utils/revert-location-vote.util';
import { validateContractSign } from '../utils/validate-contract-sign.util';
import { validateStatusChange } from '../utils/validate-status-change.util';
import {
  validateDizApproval,
  validateDizConditionApproval,
  validateRevertLocationVote,
  validateUacApproval,
} from '../utils/validate-vote.util';
import { ProposalCrudService } from './proposal-crud.service';
import { ProposalUploadService } from './proposal-upload.service';
import { StatusChangeService } from './status-change.service';
import { SetDizConditionApprovalDto } from '../dto/set-diz-condition-approval.dto';

@Injectable()
export class ProposalContractingService {
  constructor(
    private proposalCrudService: ProposalCrudService,
    private eventEngineService: EventEngineService,
    private storageService: StorageService,
    private statusChangeService: StatusChangeService,
    private proposalUploadService: ProposalUploadService,
  ) {}

  async setDizApproval(proposalId: string, vote: SetDizApprovalDto, user: IRequestUser): Promise<void> {
    const toBeUpdated = await this.proposalCrudService.findDocument(proposalId, user, undefined, true);

    validateDizApproval(toBeUpdated, user);
    addDizApproval(toBeUpdated, user, vote);
    addHistoryItemForDizApproval(toBeUpdated, user, vote.value);

    const saveResult = await toBeUpdated.save();
    await this.eventEngineService.handleProposalDizApproval(saveResult, vote.value, user.miiLocation);
  }

  async setUacApproval(
    proposalId: string,
    vote: SetUacApprovalDto,
    file: Express.Multer.File,
    user: IRequestUser,
  ): Promise<void> {
    const toBeUpdated = await this.proposalCrudService.findDocument(proposalId, user, undefined, true);

    validateUacApproval(toBeUpdated, user);
    const hasCondition = vote.value && (!!file?.buffer || this.isValidConditionReason(vote.conditionReasoning));

    const upload: UploadDto | undefined = await (async () => {
      if (!!file?.buffer) {
        const blobName = getBlobName(toBeUpdated.id, UseCaseUpload.ContractCondition);
        await this.storageService.uploadFile(blobName, file, user);
        const upload = new UploadDto(blobName, file, UseCaseUpload.ContractCondition, user);
        addUpload(toBeUpdated, upload);
        return upload;
      } else {
        return;
      }
    })();

    addUacApprovalWithCondition(toBeUpdated, user, vote, upload, vote.conditionReasoning);
    addHistoryItemForUacApproval(toBeUpdated, user, vote.value, hasCondition);

    const saveResult = await toBeUpdated.save();
    await this.eventEngineService.handleProposalUacApproval(saveResult, vote.value, user.miiLocation);
  }

  async dizConditionApproval(proposalId: string, vote: SetDizConditionApprovalDto, user: IRequestUser): Promise<void> {
    const toBeUpdated = await this.proposalCrudService.findDocument(proposalId, user, undefined, true);

    validateDizConditionApproval(toBeUpdated, user);
    const hasCondition = vote.value && this.isValidConditionReason(vote.conditionReasoning);

    if (hasCondition) {
      addDizApprovalWithCondition(toBeUpdated, user.miiLocation, vote, vote.conditionReasoning);
    } else {
      addDizConditionApproval(toBeUpdated, user, vote);
    }

    addHistoryItemForDizConditionReviewApproval(toBeUpdated, user, vote.value, hasCondition);

    await toBeUpdated.save();
  }

  async revertLocationVote(proposalId: string, location: MiiLocation, user: IRequestUser): Promise<void> {
    const toBeUpdated = await this.proposalCrudService.findDocument(proposalId, user, undefined, true);
    validateRevertLocationVote(toBeUpdated, location, user);

    await revertLocationVote(toBeUpdated, location, user, this.proposalUploadService);
    addHistoryItemForRevertLocationVote(toBeUpdated, user, location);

    await toBeUpdated.save();
  }

  async initContracting(
    proposalId: string,
    file: Express.Multer.File,
    locations: InitContractingDto,
    user: IRequestUser,
  ): Promise<void> {
    const locationList = locations.locations;
    if (locationList.length > 0) {
      const toBeUpdated = await this.proposalCrudService.findDocument(proposalId, user, undefined, true);
      const oldStatus = toBeUpdated.status;

      const throwValidation = toBeUpdated.status !== ProposalStatus.LocationCheck;
      validateStatusChange(toBeUpdated, ProposalStatus.Contracting, user, throwValidation);

      const blobName = getBlobName(toBeUpdated.id, UseCaseUpload.ContractDraft);
      await this.storageService.uploadFile(blobName, file, user);
      const upload = new UploadDto(blobName, file, UseCaseUpload.ContractDraft, user);

      addUpload(toBeUpdated, upload);

      toBeUpdated.status = ProposalStatus.Contracting;
      await this.statusChangeService.handleEffects(toBeUpdated, oldStatus, user, locationList);
      addHistoryItemForStatus(toBeUpdated, user, oldStatus);
      const saveResult = await toBeUpdated.save();
      await this.eventEngineService.handleProposalStatusChange(saveResult);
    } else {
      const errorInfo = new ValidationErrorInfo({
        constraint: 'hasLocation',
        message: 'No Location assigned',
        property: 'locations',
        code: BadRequestError.LocationNotAssignedToContract,
      });
      throw new ValidationException([errorInfo]);
    }
  }

  async updateContractDraft(
    proposalId: string,
    file: Express.Multer.File,
    uploadIdToBeReplaced: string,
    user: IRequestUser,
  ): Promise<void> {
    const toBeUpdated = await this.proposalCrudService.findDocument(proposalId, user, undefined, true);

    if (toBeUpdated.status !== ProposalStatus.Contracting) {
      const errorInfo = new ValidationErrorInfo({
        constraint: 'notInContracting',
        message: 'Proposal is not in Contracting status',
        property: 'status',
        code: BadRequestError.NotInContractingStatus,
      });
      throw new ValidationException([errorInfo]);
    }

    await this.proposalUploadService.deleteUpload(toBeUpdated, uploadIdToBeReplaced, user);

    const blobName = getBlobName(toBeUpdated.id, UseCaseUpload.ContractDraft);
    await this.storageService.uploadFile(blobName, file, user);
    const upload = new UploadDto(blobName, file, UseCaseUpload.ContractDraft, user);

    addUpload(toBeUpdated, upload);
    addHistoryItemForContractUpdate(toBeUpdated, user);

    await toBeUpdated.save();
  }

  async signContract(
    proposalId: string,
    vote: SignContractDto,
    file: Express.Multer.File,
    user: IRequestUser,
  ): Promise<void> {
    const toBeUpdated = await this.proposalCrudService.findDocument(proposalId, user, undefined, true);

    validateContractSign(toBeUpdated, user, vote, file);

    if (vote.value === true) {
      const uploadType =
        user.singleKnownRole === Role.Researcher ? UseCaseUpload.ResearcherContract : UseCaseUpload.LocationContract;
      const blobName = getBlobName(toBeUpdated.id, uploadType);
      await this.storageService.uploadFile(blobName, file, user);
      const upload = new UploadDto(blobName, file, uploadType, user);
      addUpload(toBeUpdated, upload);
    }

    addContractSign(toBeUpdated, vote, user);
    addHistoryItemForContractSign(toBeUpdated, user, vote.value);

    const saveResult = await toBeUpdated.save();
    await this.eventEngineService.handleProposalContractSign(saveResult, vote.value, user);
  }

  async markUacConditionAsAccepted(
    proposalId: string,
    conditionId: string,
    isAccepted: boolean,
    user: IRequestUser,
  ): Promise<ProposalMarkConditionAcceptedReturnDto> {
    const toBeUpdated = await this.proposalCrudService.findDocument(proposalId, user, undefined, true);
    const condition = toBeUpdated.conditionalApprovals.find((condition) => condition._id.toString() === conditionId);

    if (!condition) {
      throw new NotFoundException();
    }

    // Review only once
    if (condition.reviewedAt !== undefined) {
      throw new ForbiddenException('The condition is already reviewed');
    }

    addDizConditionReview(toBeUpdated, condition, isAccepted, user);
    addHistoryItemForUacCondition(toBeUpdated, user, isAccepted, condition.location);

    const saveResult = await toBeUpdated.save();
    const plain = saveResult.toObject();
    const userGroups = convertUserToGroups(user);
    return plainToClass(ProposalMarkConditionAcceptedReturnDto, plain, {
      strategy: 'excludeAll',
      groups: [...userGroups, ProposalValidation.IsOutput, user.singleKnownRole],
    });
  }

  isValidConditionReason(input?: string): boolean {
    return typeof input === 'string' && input.trim() !== '';
  }
}
