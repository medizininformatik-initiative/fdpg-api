import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import type { IRequestUser } from 'src/shared/types/request-user.interface';
import { ProposalCrudService } from 'src/modules/proposal/services/proposal-crud.service';
import { DataDelivery } from 'src/modules/proposal/schema/sub-schema/data-delivery/data-delivery.schema';
import type { DeliveryInfo } from 'src/modules/proposal/schema/sub-schema/data-delivery/delivery-info.schema';
import {
  DataDeliveryGetDto,
  DataDeliveryUpdateDto,
} from 'src/modules/proposal/dto/proposal/data-delivery/data-delivery.dto';
import { DeliveryInfoUpdateDto } from 'src/modules/proposal/dto/proposal/data-delivery/delivery-info.dto';
import { FhirService } from 'src/modules/fhir/fhir.service';
import { SubDeliveryUpdateDto } from '../dto/proposal/data-delivery/sub-delivery.dto';
import { SubDelivery } from '../schema/sub-schema/data-delivery/sub-delivery.schema';
import { Proposal, ProposalDocument } from '../schema/proposal.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class ProposalDataDeliveryService {
  constructor(
    private readonly proposalCrudService: ProposalCrudService,
    private readonly fhirService: FhirService,

    @InjectModel(Proposal.name)
    private proposalModel: Model<ProposalDocument>,
  ) {}

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
      deliveryInfos: this.mapToDeliveryInfoModel(dto.deliveryInfos),
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
      deliveryInfos: this.mapToDeliveryInfoModel(dto.deliveryInfos),
      createdAt: existing.createdAt ?? now,
      updatedAt: now,
    };
    const saved = await proposal.save();

    return plainToClass(DataDeliveryGetDto, saved.dataDelivery as DataDelivery, { strategy: 'excludeAll' });
  };

  initDeliveryInfo = async (
    proposalId: string,
    dto: DeliveryInfoUpdateDto,
    user: IRequestUser,
  ): Promise<DataDeliveryGetDto> => {
    const proposalDoc = await this.proposalCrudService.findDocument(proposalId, user);

    if (!proposalDoc.dataDelivery.deliveryInfos) {
      proposalDoc.dataDelivery.deliveryInfos = [];
    }
    const newDeliveryModel = this.mapToDeliveryInfoModel([dto])[0];

    await this.proposalModel
      .updateOne(
        {
          _id: proposalId,
          'dataDelivery.deliveryInfos': null,
        },
        {
          $set: { 'dataDelivery.deliveryInfos': [] },
        },
      )
      .exec();

    const updatedProposalDoc = await this.proposalModel
      .findOneAndUpdate(
        { _id: proposalId },
        {
          $push: { 'dataDelivery.deliveryInfos': newDeliveryModel },
          $set: { 'dataDelivery.updatedAt': new Date() },
        },
        {
          new: true,
          runValidators: true,
        },
      )
      .exec();

    if (!updatedProposalDoc) {
      throw new ForbiddenException('Proposal document not found or user unauthorized.');
    }

    return plainToClass(DataDeliveryGetDto, updatedProposalDoc.dataDelivery as DataDelivery, {
      strategy: 'excludeAll',
    });
  };

  private mapToDeliveryInfoModel = (dtos: DeliveryInfoUpdateDto[] | null | undefined): DeliveryInfo[] | null => {
    if (dtos === undefined || dtos === null) return null;

    return dtos.map((dto) => ({
      name: dto.name,
      deliveryDate: dto.deliveryDate,
      status: dto.status,
      subDeliveries: (dto.subDeliveries || []).map(this.mapToSubDeliveryModel),
    }));
  };

  private mapToSubDeliveryModel = (dto: SubDeliveryUpdateDto): SubDelivery => {
    const modelInstance = new SubDelivery();
    const subDeliveryKeys = Object.keys(modelInstance) as (keyof SubDelivery)[];

    const subDeliveryModel = new SubDelivery();

    subDeliveryKeys.forEach((key) => {
      if (key in dto) {
        (subDeliveryModel as any)[key] = (dto as any)[key];
      }
    });

    return subDeliveryModel;
  };
}
