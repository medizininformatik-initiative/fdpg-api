import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
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
import { LocationService } from 'src/modules/location/service/location.service';
import { SubDeliveryStatus } from '../enums/data-delivery.enum';
import { ProposalValidation } from '../enums/porposal-validation.enum';
import { DeliveryInfoStatus } from '../enums/delivery-info-status.enum';

@Injectable()
export class ProposalDataDeliveryService {
  constructor(
    private readonly proposalCrudService: ProposalCrudService,
    private readonly fhirService: FhirService,
    private readonly locationService: LocationService,

    @InjectModel(Proposal.name)
    private proposalModel: Model<ProposalDocument>,
  ) {}

  private readonly logger = new Logger(ProposalDataDeliveryService.name);

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
      const message = 'No data delivery found. Create it first.';
      this.logger.error(message);
      throw new NotFoundException(message);
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
    const newDeliveryModel = { ...this.mapToDeliveryInfoModel([dto])[0], lastSynced: undefined } as DeliveryInfo;

    await this.fhirService.createCoordinateDataSharingTask(newDeliveryModel, proposalDoc.toObject());

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

    return plainToClass(DataDeliveryGetDto, updatedProposalDoc.toObject().dataDelivery as DataDelivery, {
      strategy: 'excludeAll',
      groups: [ProposalValidation.IsOutput],
    });
  };

  syncDeliveryInfoWithDsfWithUser = async (
    proposalId: string,
    dto: DeliveryInfoUpdateDto,
    user: IRequestUser,
  ): Promise<DataDeliveryGetDto> => {
    const proposalDoc = await this.proposalCrudService.findDocument(proposalId, user);

    const deliveryInfo = (proposalDoc.dataDelivery?.deliveryInfos || []).find(
      (deliveryInfo) => deliveryInfo._id.toString() === dto._id,
    );

    await this.syncDeliveryInfoWithDsf(proposalId, deliveryInfo);

    return plainToClass(DataDeliveryGetDto, proposalDoc.toObject().dataDelivery as DataDelivery, {
      strategy: 'excludeAll',
      groups: [ProposalValidation.IsOutput],
    });
  };

  syncDeliveryInfoWithDsf = async (proposalId: string, deliveryInfo?: DeliveryInfo): Promise<void> => {
    if (!deliveryInfo) {
      const message = `Could not find DeliveryInfo with id ${deliveryInfo._id} of proposal ${proposalId}`;
      this.logger.error(message);
      throw new NotFoundException(message);
    }

    if (!deliveryInfo.fhirBusinessKey) {
      const message = `DeliveryInfo ${deliveryInfo._id} of proposal ${proposalId} does not have a business key`;
      this.logger.error(message);
      throw new NotFoundException(message);
    }

    const locationLookUpMap = await this.locationService.findAllLookUpMap();

    const updatedFhirDeliveries = (
      await this.fhirService.pollForReceivedDataSetsByBusinessKey(
        deliveryInfo.fhirBusinessKey,
        deliveryInfo.lastSynced ?? deliveryInfo.createdAt,
      )
    ).map((fhirResponse) => fhirResponse['dic-identifier-value']);

    // TODO: I don't know how to set the state until we are able to test the whole process
    (deliveryInfo.subDeliveries || []).forEach((subDel) => {
      if (updatedFhirDeliveries.includes(locationLookUpMap[subDel.location]?.uri)) {
        subDel.status = SubDeliveryStatus.DELIVERED;
      }
    });

    deliveryInfo.lastSynced = new Date();

    const updatedProposalDoc = await this.proposalModel
      .findOneAndUpdate(
        {
          _id: proposalId,
          'dataDelivery.deliveryInfos._id': deliveryInfo._id,
        },
        {
          $set: {
            'dataDelivery.deliveryInfos.$': deliveryInfo,
            'dataDelivery.updatedAt': new Date(),
          },
        },
        {
          new: true,
          runValidators: true,
        },
      )
      .exec();

    if (!updatedProposalDoc) {
      throw new ForbiddenException('Proposal document not found or deliveryInfo not found.');
    }
  };

  getProposalsWithDeliveriesPending = async (): Promise<Proposal[]> => {
    return await this.proposalModel.find({
      'dataDelivery.deliveryInfos': {
        $elemMatch: {
          status: DeliveryInfoStatus.PENDING,
        },
      },
    });
  };

  private mapToDeliveryInfoModel = (dtos: DeliveryInfoUpdateDto[] | null | undefined): DeliveryInfo[] | null => {
    if (dtos === undefined || dtos === null) return null;

    return dtos.map((dto) => ({
      _id: dto._id,
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
