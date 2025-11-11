import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import type { IRequestUser } from 'src/shared/types/request-user.interface';
import { ProposalCrudService } from 'src/modules/proposal/services/proposal-crud.service';
import type { DataDelivery } from 'src/modules/proposal/schema/sub-schema/data-delivery/data-delivery.schema';
import type { DeliveryInfo } from 'src/modules/proposal/schema/sub-schema/data-delivery/delivery-info.schema';
import {
  DataDeliveryGetDto,
  DataDeliveryUpdateDto,
} from 'src/modules/proposal/dto/proposal/data-delivery/data-delivery.dto';
import { DeliveryInfoUpdateDto } from 'src/modules/proposal/dto/proposal/data-delivery/delivery-info.dto';

@Injectable()
export class ProposalDataDeliveryService {
  constructor(private readonly proposalCrudService: ProposalCrudService) {}

  getDataDelivery = async (proposalId: string, user: IRequestUser): Promise<DataDeliveryGetDto | null> => {
    const proposal = await this.proposalCrudService.findDocument(
      proposalId,
      user,
      { dataDelivery: 1 },
      /* willBeModified */ false,
    );

    const dataDelivery = proposal.dataDelivery ?? null;
    return dataDelivery ? plainToClass(DataDeliveryGetDto, dataDelivery, { strategy: 'excludeAll' }) : null;
  };

  createDataDelivery = async (
    proposalId: string,
    dto: DataDeliveryUpdateDto,
    user: IRequestUser,
  ): Promise<DataDeliveryGetDto> => {
    const proposal = await this.proposalCrudService.findDocument(
      proposalId,
      user,
      { dataDelivery: 1 },
      /* willBeModified */ true,
    );

    if (proposal.dataDelivery) {
      throw new BadRequestException('Data delivery already exists. Use update instead.');
    }

    const now = new Date();

    proposal.dataDelivery = {
      dataManagementSite: dto.dataManagementSite,
      acceptance: dto.acceptance,
      delivery: this.mapToDeliveryInfo(dto.delivery),
      createdAt: now,
      updatedAt: now,
    };
    const saved = await proposal.save();

    return plainToClass(DataDeliveryGetDto, saved.dataDelivery as DataDelivery, { strategy: 'excludeAll' });
  };

  updateDataDelivery = async (
    proposalId: string,
    dto: DataDeliveryUpdateDto,
    user: IRequestUser,
  ): Promise<DataDeliveryGetDto> => {
    const proposal = await this.proposalCrudService.findDocument(
      proposalId,
      user,
      { dataDelivery: 1 },
      /* willBeModified */ true,
    );

    const existing = proposal.dataDelivery ?? null;
    if (!existing) {
      throw new NotFoundException('No data delivery found. Create it first.');
    }

    const now = new Date();

    proposal.dataDelivery = {
      dataManagementSite: dto.dataManagementSite,
      acceptance: dto.acceptance,
      delivery: this.mapToDeliveryInfo(dto.delivery),
      createdAt: existing.createdAt ?? now,
      updatedAt: now,
    };
    const saved = await proposal.save();

    return plainToClass(DataDeliveryGetDto, saved.dataDelivery as DataDelivery, { strategy: 'excludeAll' });
  };

  private mapToDeliveryInfo = (dtos: DeliveryInfoUpdateDto[] | null | undefined): DeliveryInfo[] | null => {
    if (dtos === undefined || dtos === null) return null;

    return dtos.map((dto) => ({
      name: dto.name,
      date: dto.date,
      subDeliveries: [], // ignore subdeliveries for now
    }));
  };
}
