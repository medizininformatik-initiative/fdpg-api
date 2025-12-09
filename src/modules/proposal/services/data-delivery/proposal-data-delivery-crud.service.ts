import { Model } from 'mongoose';
import { Proposal, ProposalDocument } from '../../schema/proposal.schema';
import { InjectModel } from '@nestjs/mongoose';
import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ProposalCrudService } from '../proposal-crud.service';
import { DataDelivery } from '../../schema/sub-schema/data-delivery/data-delivery.schema';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import { DeliveryAcceptance } from '../../enums/data-delivery.enum';
import { DataDeliveryUpdateDto } from '../../dto/proposal/data-delivery/data-delivery.dto';
import { ProposalDataDeliveryMappingService } from './proposal-data-delivery-mapping.service';
import { DeliveryInfo } from '../../schema/sub-schema/data-delivery/delivery-info.schema';
import { DeliveryInfoStatus } from '../../enums/delivery-info-status.enum';

@Injectable()
export class ProposalDataDeliveryCrudService {
  constructor(
    private readonly proposalCrudService: ProposalCrudService,
    @InjectModel(Proposal.name) private readonly proposalModel: Model<ProposalDocument>,
    private readonly proposalDataDeliveryMappingService: ProposalDataDeliveryMappingService,
  ) {}

  private readonly logger = new Logger(ProposalDataDeliveryCrudService.name);

  getDataDelivery = async (proposalId: string, user: IRequestUser): Promise<DataDelivery | null> => {
    const proposal = await this.proposalCrudService.findDocument(
      proposalId,
      user,
      { dataDelivery: 1 },
      /* willBeModified */ false,
    );

    return proposal.dataDelivery ?? null;
  };

  createDataDelivery = async (
    proposalId: string,
    dmsId: string,
    acceptance: DeliveryAcceptance,
    user: IRequestUser,
  ): Promise<ProposalDocument> => {
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
      dataManagementSite: dmsId,
      acceptance: acceptance,
      deliveryInfos: [],
      createdAt: now,
      updatedAt: now,
    };

    return await proposal.save();
  };

  updateDataDelivery = async (
    proposalId: string,
    dto: DataDeliveryUpdateDto,
    user: IRequestUser,
  ): Promise<ProposalDocument> => {
    const proposal = await this.proposalCrudService.findDocument(
      proposalId,
      user,
      { dataDelivery: 1, history: 1 },
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
      deliveryInfos: this.proposalDataDeliveryMappingService.mapToDeliveryInfoModel(dto.deliveryInfos),
      createdAt: existing.createdAt ?? now,
      updatedAt: now,
    };

    return await proposal.save();
  };

  updateDeliveryInfo = async (proposalId: string, deliveryInfo: DeliveryInfo): Promise<ProposalDocument> => {
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

    return updatedProposalDoc;
  };

  findDeliveryInfoByProposalId = async (
    proposalId: string,
    deliveryInfoId: string,
    user: IRequestUser,
  ): Promise<DeliveryInfo | null> => {
    const proposalDoc = await this.proposalCrudService.findDocument(proposalId, user);

    return this.findDeliveryInfoInProposal(proposalDoc, deliveryInfoId);
  };

  findDeliveryInfoInProposal = (proposal: Proposal, deliveryInfoId: string): DeliveryInfo | null => {
    const deliveryInfo = (proposal.dataDelivery?.deliveryInfos || []).find(
      (deliveryInfo) => deliveryInfo._id.toString() === deliveryInfoId,
    );

    return deliveryInfo ?? null;
  };

  getProposalsWithDeliveriesByStatus = async (status: DeliveryInfoStatus): Promise<Proposal[]> => {
    return await this.proposalModel.find({
      'dataDelivery.deliveryInfos': {
        $elemMatch: {
          status,
        },
      },
    });
  };

  createDeliveryInfo = async (proposalId: string, deliveryInfo: DeliveryInfo): Promise<ProposalDocument> => {
    const updatedProposalDoc = await this.proposalModel
      .findOneAndUpdate(
        { _id: proposalId },
        {
          $push: { 'dataDelivery.deliveryInfos': deliveryInfo },
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

    return updatedProposalDoc;
  };
}
