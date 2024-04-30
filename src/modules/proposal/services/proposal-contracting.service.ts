import { ProposalUploadService } from './proposal-upload.service';
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { Role } from 'src/shared/enums/role.enum';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import { convertUserToGroups } from 'src/shared/utils/user-group.utils';
import { StorageService } from '../../storage/storage.service';
import { EventEngineService } from '../../event-engine/event-engine.service';
import { ProposalMarkConditionAcceptedReturnDto } from '../dto/proposal/proposal.dto';
import { SetUacApprovalDto } from '../dto/set-uac-approval.dto';
import { SignContractDto } from '../dto/sign-contract.dto';
import { UploadDto } from '../dto/upload.dto';
import { ProposalValidation } from '../enums/porposal-validation.enum';
import { ProposalStatus } from '../enums/proposal-status.enum';
import { UseCaseUpload } from '../enums/upload-type.enum';
import { ProposalCrudService } from './proposal-crud.service';
import { StatusChangeService } from './status-change.service';
import { addContractSign } from '../utils/add-contract-sign.util';
import {
  addDizApproval,
  addUacApproval,
  addUacApprovalWithCondition,
  addUacConditionReview,
  handleLocationDecision,
} from '../utils/handle-location-vote.util';
import {
  addHistoryItemForContractSign,
  addHistoryItemForDizApproval,
  addHistoryItemForStatus,
  addHistoryItemForUacApproval,
  addHistoryItemForUacCondition,
  addHistoryItemForRevertLocationDecision,
} from '../utils/proposal-history.util';
import { addUpload, getBlobName } from '../utils/proposal.utils';
import { validateContractSign } from '../utils/validate-contract-sign.util';
import { validateStatusChange } from '../utils/validate-status-change.util';
import { validateDizApproval, validateUacApproval, validateRevertLocationDecision } from '../utils/validate-vote.util';
import { SetDizApprovalDto } from '../dto/set-diz-approval.dto';
import { InitContractingDto } from '../dto/proposal/init-contracting.dto';
import { ValidationErrorInfo } from 'src/shared/dto/validation/validation-error-info.dto';
import { ValidationException } from 'src/exceptions/validation/validation.exception';
import { BadRequestError } from 'src/shared/enums/bad-request-error.enum';
import { MiiLocation } from 'src/shared/constants/mii-locations';

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
    const hasCondition = !!file?.buffer && vote.value;

    if (hasCondition) {
      const blobName = getBlobName(toBeUpdated.id, UseCaseUpload.ContractCondition);
      await this.storageService.uploadFile(blobName, file, user);
      const upload = new UploadDto(blobName, file, UseCaseUpload.ContractCondition, user);
      addUpload(toBeUpdated, upload);
      addUacApprovalWithCondition(toBeUpdated, user.miiLocation, upload, vote);
    } else {
      addUacApproval(toBeUpdated, user, vote);
    }

    addHistoryItemForUacApproval(toBeUpdated, user, vote.value, hasCondition);

    const saveResult = await toBeUpdated.save();
    await this.eventEngineService.handleProposalUacApproval(saveResult, vote.value, user.miiLocation);
  }

  async revertLocationDecision(proposalId: string, location: MiiLocation, user: IRequestUser): Promise<void> {
    const toBeUpdated = await this.proposalCrudService.findDocument(proposalId, user, undefined, true);
    validateRevertLocationDecision(toBeUpdated);

    await handleLocationDecision(toBeUpdated, location, user, this.proposalUploadService);
    addHistoryItemForRevertLocationDecision(toBeUpdated, user, location);

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

    addUacConditionReview(toBeUpdated, condition, isAccepted, user);
    addHistoryItemForUacCondition(toBeUpdated, user, isAccepted, condition.location);

    const saveResult = await toBeUpdated.save();
    const plain = saveResult.toObject();
    const userGroups = convertUserToGroups(user);
    return plainToClass(ProposalMarkConditionAcceptedReturnDto, plain, {
      strategy: 'excludeAll',
      groups: [...userGroups, ProposalValidation.IsOutput, user.singleKnownRole],
    });
  }
}
