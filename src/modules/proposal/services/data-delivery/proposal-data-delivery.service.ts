import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
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
import { SubDeliveryStatus } from '../../enums/data-delivery.enum';

@Injectable()
export class ProposalDataDeliveryService {
  constructor(
    private readonly proposalCrudService: ProposalCrudService,
    private readonly proposalDataDeliveryCrudService: ProposalDataDeliveryCrudService,
    private readonly proposalDataDeliverySyncService: ProposalDataDeliverySyncService,
    private readonly proposalDeliveryInfoService: ProposalDeliveryInfoService,
    private readonly proposalSubDeliveryService: ProposalSubDeliveryService,
  ) {}

  private readonly logger = new Logger(ProposalDataDeliveryService.name);

  getDataDelivery = async (proposalId: string, user: IRequestUser): Promise<DataDeliveryGetDto | null> => {
    const dataDelivery = await this.proposalDataDeliveryCrudService.getDataDelivery(proposalId, user);
    return dataDelivery ? plainToClass(DataDeliveryGetDto, dataDelivery, { strategy: 'excludeAll' }) : null;
  };

  createDataDelivery = async (
    proposalId: string,
    dto: DataDeliveryUpdateDto,
    user: IRequestUser,
  ): Promise<DataDeliveryGetDto> => {
    const dataDelivery = await this.proposalDataDeliveryCrudService.createDataDelivery(
      proposalId,
      dto.dataManagementSite,
      dto.acceptance,
      user,
    );

    return plainToClass(DataDeliveryGetDto, dataDelivery, { strategy: 'excludeAll' });
  };

  updateDataDelivery = async (
    proposalId: string,
    dto: DataDeliveryUpdateDto,
    user: IRequestUser,
  ): Promise<DataDeliveryGetDto> => {
    const updated = await this.proposalDataDeliveryCrudService.updateDataDelivery(proposalId, dto, user);
    return plainToClass(DataDeliveryGetDto, updated, { strategy: 'excludeAll' });
  };

  initDeliveryInfo = async (
    proposalid: string,
    dto: DeliveryInfoUpdateDto,
    user: IRequestUser,
  ): Promise<DataDeliveryGetDto> => {
    const proposalDoc = await this.proposalCrudService.findDocument(proposalid, user);
    const saved = await this.proposalDeliveryInfoService.initDeliveryInfo(proposalDoc.toObject(), dto, user);
    return plainToClass(DataDeliveryGetDto, saved, {
      strategy: 'excludeAll',
      groups: [ProposalValidation.IsOutput],
    });
  };

  rateSubDelivery = async (
    proposalId: string,
    deliveryInfoId: string,
    subDeliveryId: string,
    rating: SubDeliveryStatus,
  ): Promise<DataDeliveryGetDto> => {
    const updated = await this.proposalSubDeliveryService.rateDelivery(
      proposalId,
      deliveryInfoId,
      subDeliveryId,
      rating,
    );

    return plainToClass(DataDeliveryGetDto, updated, {
      strategy: 'excludeAll',
      groups: [ProposalValidation.IsOutput],
    });
  };

  setDeliveryInfoStatus = async (
    proposalId: string,
    dto: DeliveryInfoUpdateDto,
    user: IRequestUser,
  ): Promise<DataDeliveryGetDto> => {
    const deliveryInfo = await this.proposalDataDeliveryCrudService.findDeliveryInfoByProposalId(
      proposalId,
      dto._id,
      user,
    );

    if (dto.status === DeliveryInfoStatus.WAITING_FOR_DATA_SET || dto.status === DeliveryInfoStatus.PENDING) {
      this.proposalDeliveryInfoService.setToForwardDelivery(deliveryInfo);
      await this.proposalDataDeliverySyncService.syncSubDeliveryStatusesWithDsf(proposalId, deliveryInfo);
    } else if (dto.status === DeliveryInfoStatus.CANCELED) {
      this.proposalDeliveryInfoService.setToCancelDelivery(deliveryInfo);
    } else {
      throw new ForbiddenException(`Cannot set status ${dto.status}`);
    }

    const updated = await this.proposalDataDeliveryCrudService.updateDeliveryInfo(proposalId, deliveryInfo);
    return plainToClass(DataDeliveryGetDto, updated, { strategy: 'excludeAll' });
  };

  syncDeliveryInfoWithDsf = async (
    proposalId: string,
    dto: DeliveryInfoUpdateDto,
    user: IRequestUser,
  ): Promise<DataDeliveryGetDto> => {
    const deliveryInfo = await this.proposalDataDeliveryCrudService.findDeliveryInfoByProposalId(
      proposalId,
      dto._id,
      user,
    );

    if (!deliveryInfo) {
      const message = `Could not find DeliveryInfo with id '${dto._id}' of proposal '${proposalId}'`;
      this.logger.error(message);
      throw new NotFoundException(message);
    }

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

    await this.proposalDataDeliveryCrudService.updateDeliveryInfo(proposalId, deliveryInfo);

    return plainToClass(DataDeliveryGetDto, deliveryInfo, {
      strategy: 'excludeAll',
      groups: [ProposalValidation.IsOutput],
    });
  };
}
