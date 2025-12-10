import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import type { IRequestUser } from 'src/shared/types/request-user.interface';
import {
  DataDeliveryGetDto,
  DataDeliveryUpdateDto,
} from 'src/modules/proposal/dto/proposal/data-delivery/data-delivery.dto';
import { DeliveryInfoUpdateDto } from 'src/modules/proposal/dto/proposal/data-delivery/delivery-info.dto';
import { ProposalValidation } from '../../enums/porposal-validation.enum';
import { ProposalDataDeliveryCrudService } from './proposal-data-delivery-crud.service';
import { ProposalDataDeliverySyncService } from './proposal-data-delivery-sync.service';
import { ProposalCrudService } from '../proposal-crud.service';
import { ProposalDeliveryInfoService } from './proposal-delivery-info.service';
import { DeliveryInfoStatus } from '../../enums/delivery-info-status.enum';
import { ProposalSubDeliveryService } from './proposal-sub-delivery.service';
import { DeliveryAcceptance, SubDeliveryStatus } from '../../enums/data-delivery.enum';
import {
  addHistoryItemForCanceledDelivery,
  addHistoryItemForDataDeliveryConcluded,
  addHistoryItemForDmoAcceptanceAnswer,
  addHistoryItemForDmoRequest,
  addHistoryItemForForwardedDelivery,
  addHistoryItemForInitiateDelivery,
} from '../../utils/proposal-history.util';
import { Role } from 'src/shared/enums/role.enum';
import { DataDelivery } from '../../schema/sub-schema/data-delivery/data-delivery.schema';
import { DeliveryInfo } from '../../schema/sub-schema/data-delivery/delivery-info.schema';
import { ProposalGetDto } from '../../dto/proposal/proposal.dto';
import { ProposalMiscService } from '../proposal-misc.service';
import { ProposalStatus } from '../../enums/proposal-status.enum';
import { Proposal } from '../../schema/proposal.schema';

@Injectable()
export class ProposalDataDeliveryService {
  constructor(
    private readonly proposalCrudService: ProposalCrudService,
    private readonly proposalDataDeliveryCrudService: ProposalDataDeliveryCrudService,
    private readonly proposalDataDeliverySyncService: ProposalDataDeliverySyncService,
    private readonly proposalDeliveryInfoService: ProposalDeliveryInfoService,
    private readonly proposalSubDeliveryService: ProposalSubDeliveryService,
    private readonly proposalMiscService: ProposalMiscService,
  ) {}

  private readonly logger = new Logger(ProposalDataDeliveryService.name);

  getDataDelivery = async (proposalId: string, user: IRequestUser): Promise<DataDeliveryGetDto | null> => {
    const dataDelivery = await this.proposalDataDeliveryCrudService.getDataDelivery(proposalId, user);
    return dataDelivery ? this.dataDeliveryModelToGetDto(dataDelivery) : null;
  };

  createDataDelivery = async (
    proposalId: string,
    dto: DataDeliveryUpdateDto,
    user: IRequestUser,
  ): Promise<DataDeliveryGetDto> => {
    const updatedProposal = await this.proposalDataDeliveryCrudService.createDataDelivery(
      proposalId,
      dto.dataManagementSite,
      dto.acceptance,
      user,
    );

    addHistoryItemForDmoRequest(updatedProposal, user, updatedProposal.dataDelivery.dataManagementSite);

    await updatedProposal.save();

    return this.dataDeliveryModelToGetDto(updatedProposal.dataDelivery);
  };

  updateDataDelivery = async (
    proposalId: string,
    dto: DataDeliveryUpdateDto,
    user: IRequestUser,
  ): Promise<DataDeliveryGetDto> => {
    const beforeUpdateProposal = await this.proposalCrudService.find(proposalId, user);
    const updatedProposal = await this.proposalDataDeliveryCrudService.updateDataDelivery(proposalId, dto, user);

    const isDmsAcceptanceAnswer =
      updatedProposal &&
      user.singleKnownRole === Role.DataManagementOffice &&
      updatedProposal.dataDelivery.acceptance !== beforeUpdateProposal.dataDelivery?.acceptance;

    const isDmsRequest =
      updatedProposal &&
      user.singleKnownRole === Role.FdpgMember &&
      updatedProposal.dataDelivery.dataManagementSite !== beforeUpdateProposal.dataDelivery?.dataManagementSite &&
      updatedProposal.dataDelivery.acceptance === DeliveryAcceptance.PENDING;

    if (isDmsAcceptanceAnswer) {
      console.log({ updatedProposal });
      addHistoryItemForDmoAcceptanceAnswer(updatedProposal, user, updatedProposal.dataDelivery.acceptance);
    }

    if (isDmsRequest) {
      addHistoryItemForDmoRequest(updatedProposal, user, updatedProposal.dataDelivery.dataManagementSite);
    }

    await updatedProposal.save();

    return this.dataDeliveryModelToGetDto(updatedProposal.dataDelivery);
  };

  setDmsVote = async (
    proposalId: string,
    acceptance: DeliveryAcceptance,
    user: IRequestUser,
  ): Promise<DataDeliveryGetDto> => {
    const proposalDoc = await this.proposalCrudService.findDocument(proposalId, user);
    const dataDelivery = proposalDoc.dataDelivery;

    if (!dataDelivery) {
      throw new NotFoundException();
    }

    if (user.singleKnownRole === Role.DataManagementOffice && dataDelivery.dataManagementSite !== user.miiLocation) {
      throw new ForbiddenException('User is not from the requested location');
    }

    const updateDto = plainToClass(DataDeliveryUpdateDto, dataDelivery, {
      strategy: 'excludeAll',
      groups: [ProposalValidation.IsOutput],
    });

    return await this.updateDataDelivery(proposalId, { ...updateDto, acceptance }, user);
  };

  initDeliveryInfo = async (
    proposalId: string,
    dto: DeliveryInfoUpdateDto,
    user: IRequestUser,
  ): Promise<DataDeliveryGetDto> => {
    const proposalDoc = await this.proposalCrudService.findDocument(proposalId, user);
    const updatedProposal = await this.proposalDeliveryInfoService.initDeliveryInfo(proposalDoc.toObject(), dto, user);

    addHistoryItemForInitiateDelivery(
      updatedProposal,
      user,
      dto.name,
      dto.manualEntry,
      dto.subDeliveries.map(({ location }) => location),
    );
    await updatedProposal.save();

    return this.dataDeliveryModelToGetDto(updatedProposal.dataDelivery);
  };

  rateSubDelivery = async (
    proposalId: string,
    deliveryInfoId: string,
    subDeliveryId: string,
    rating: SubDeliveryStatus,
  ): Promise<DataDeliveryGetDto> => {
    const updatedProposal = await this.proposalSubDeliveryService.rateDelivery(
      proposalId,
      deliveryInfoId,
      subDeliveryId,
      rating,
    );

    return this.dataDeliveryModelToGetDto(updatedProposal.dataDelivery);
  };

  setDeliveryInfoStatus = async (
    proposalId: string,
    dto: DeliveryInfoUpdateDto,
    user: IRequestUser,
  ): Promise<DataDeliveryGetDto> => {
    const deliveryInfo = await this.findDeliveryInfoValidated(proposalId, dto._id, user);

    if (dto.status === DeliveryInfoStatus.WAITING_FOR_DATA_SET || dto.status === DeliveryInfoStatus.PENDING) {
      await this.proposalDeliveryInfoService.setToForwardDelivery(deliveryInfo);
      await this.proposalDataDeliverySyncService.syncDeliveryInfoResultWithDsf(proposalId, deliveryInfo);
    } else if (dto.status === DeliveryInfoStatus.CANCELED) {
      this.proposalDeliveryInfoService.setToCancelDelivery(deliveryInfo);
    } else {
      throw new ForbiddenException(`Cannot set status ${dto.status}`);
    }

    const updatedProposal = await this.proposalDataDeliveryCrudService.updateDeliveryInfo(proposalId, deliveryInfo);

    if (dto.status === DeliveryInfoStatus.WAITING_FOR_DATA_SET || dto.status === DeliveryInfoStatus.PENDING) {
      addHistoryItemForForwardedDelivery(
        updatedProposal,
        user,
        dto.name,
        dto.subDeliveries.map(({ location }) => location),
      );
    } else if (dto.status === DeliveryInfoStatus.CANCELED) {
      addHistoryItemForCanceledDelivery(
        updatedProposal,
        user,
        dto.name,
        dto.subDeliveries.map(({ location }) => location),
      );
    }

    updatedProposal.save();

    return this.dataDeliveryModelToGetDto(updatedProposal.dataDelivery);
  };

  syncDeliveryInfoWithDsf = async (
    proposalId: string,
    dto: DeliveryInfoUpdateDto,
    user: IRequestUser,
  ): Promise<DataDeliveryGetDto> => {
    const deliveryInfo = await this.findDeliveryInfoValidated(proposalId, dto._id, user);

    if (![DeliveryInfoStatus.PENDING, DeliveryInfoStatus.WAITING_FOR_DATA_SET].includes(deliveryInfo.status)) {
      const message = `Cannot sync DeliveryInfo with id '${dto._id}' of proposal '${proposalId}' because its status is '${deliveryInfo.status}'`;
      this.logger.error(message);
      throw new ForbiddenException(message);
    }

    if (deliveryInfo.status === DeliveryInfoStatus.PENDING) {
      await this.proposalDataDeliverySyncService.syncSubDeliveryStatusesWithDsf(proposalId, deliveryInfo);
    } else if (deliveryInfo.status === DeliveryInfoStatus.WAITING_FOR_DATA_SET) {
      await this.proposalDataDeliverySyncService.syncDeliveryInfoResultWithDsf(proposalId, deliveryInfo);
    }

    const updatedProposal = await this.proposalDataDeliveryCrudService.updateDeliveryInfo(proposalId, deliveryInfo);

    return this.dataDeliveryModelToGetDto(updatedProposal.dataDelivery);
  };

  extendDeliveryDate = async (
    proposalId: string,
    deliveryInfoId: string,
    newDeliveryDate: Date,
    user: IRequestUser,
  ): Promise<DataDeliveryGetDto> => {
    const deliveryInfo = await this.findDeliveryInfoValidated(proposalId, deliveryInfoId, user);

    if (newDeliveryDate.getTime() < new Date(deliveryInfo.deliveryDate).getTime()) {
      throw new BadRequestException(
        `New delivery date '${newDeliveryDate.toISOString()}' cannot be before current delivery date '${deliveryInfo.deliveryDate.toISOString()}'`,
      );
    }

    await this.proposalDeliveryInfoService.extendDeliveryInfo(deliveryInfo, newDeliveryDate);

    const updatedProposal = await this.proposalDataDeliveryCrudService.updateDeliveryInfo(proposalId, deliveryInfo);

    return this.dataDeliveryModelToGetDto(updatedProposal.dataDelivery);
  };

  setStatusToFetched = async (proposalId: string, deliveryInfoId: string, user: IRequestUser) => {
    const deliveryInfo = await this.findDeliveryInfoValidated(proposalId, deliveryInfoId, user);

    if (!deliveryInfo.manualEntry && deliveryInfo.status !== DeliveryInfoStatus.WAITING_FOR_DATA_SET) {
      throw new Error(
        `Status of deliveryInfo '${deliveryInfoId}' of proposal '${proposalId}' cannot be set to ${DeliveryInfoStatus.FETCHED_BY_RESEARCHER} because status is '${deliveryInfo.status}'`,
      );
    }

    this.proposalDeliveryInfoService.setStatusToFetched(deliveryInfo);
    const updatedProposal = await this.proposalDataDeliveryCrudService.updateDeliveryInfo(proposalId, deliveryInfo);

    addHistoryItemForDataDeliveryConcluded(updatedProposal, user, deliveryInfo.name);
    await updatedProposal.save();

    return this.dataDeliveryModelToGetDto(updatedProposal.dataDelivery);
  };

  researcherStartedAnalysis = async (proposalId: string, user: IRequestUser): Promise<ProposalGetDto> => {
    const proposal = await this.proposalCrudService.findDocument(proposalId, user);

    const dataDelivery = proposal.dataDelivery;
    dataDelivery.deliveryInfos.map((di) => this.setFinalDeliveryInfoStateForAnalysis(di, proposal, user));

    await Promise.all(
      dataDelivery.deliveryInfos.map(async (di) => {
        return await this.proposalDataDeliveryCrudService.updateDeliveryInfo(proposalId, di);
      }),
    );
    await proposal.save();

    return plainToClass(ProposalGetDto, proposal.toObject(), {
      strategy: 'excludeAll',
      groups: [ProposalValidation.IsOutput],
    });
  };

  private setFinalDeliveryInfoStateForAnalysis = async (
    deliveryInfo: DeliveryInfo,
    proposal: Proposal,
    user: IRequestUser,
  ): Promise<void> => {
    if ([DeliveryInfoStatus.FETCHED_BY_RESEARCHER, DeliveryInfoStatus.CANCELED].includes(deliveryInfo.status)) {
      return;
    }

    if ([DeliveryInfoStatus.WAITING_FOR_DATA_SET, DeliveryInfoStatus.RESULTS_AVAILABLE].includes(deliveryInfo.status)) {
      this.proposalDeliveryInfoService.setStatusToFetched(deliveryInfo);
      addHistoryItemForDataDeliveryConcluded(proposal, user, deliveryInfo.name);
    } else {
      this.proposalDeliveryInfoService.setToCancelDelivery(deliveryInfo);
      addHistoryItemForCanceledDelivery(
        proposal,
        user,
        deliveryInfo.name,
        deliveryInfo.subDeliveries.map(({ location }) => location),
      );
    }
  };

  private findDeliveryInfoValidated = async (
    proposalId: string,
    deliveryInfoId: string,
    user: IRequestUser,
  ): Promise<DeliveryInfo> => {
    const deliveryInfo = await this.proposalDataDeliveryCrudService.findDeliveryInfoByProposalId(
      proposalId,
      deliveryInfoId,
      user,
    );

    if (!deliveryInfo) {
      const msg = `DeliveryInfo with Id '${deliveryInfoId}' of proposal '${proposalId}' not found`;
      this.logger.error(msg);
      throw new NotFoundException(msg);
    }

    return deliveryInfo;
  };

  private dataDeliveryModelToGetDto = (dataDelivery: DataDelivery): DataDeliveryGetDto => {
    return plainToClass(DataDeliveryGetDto, dataDelivery, {
      strategy: 'excludeAll',
      groups: [ProposalValidation.IsOutput],
    });
  };
}
