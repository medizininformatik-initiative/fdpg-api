import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ProposalDataDeliveryService } from './proposal-data-delivery.service';
import { SubDeliveryStatus } from '../../enums/data-delivery.enum';
import { InjectModel } from '@nestjs/mongoose';
import { Proposal, ProposalDocument } from '../../schema/proposal.schema';
import { Model } from 'mongoose';
import { DataDelivery } from '../../schema/sub-schema/data-delivery/data-delivery.schema';

@Injectable()
export class ProposalSubDeliveryService {
  constructor(@InjectModel(Proposal.name) private readonly proposalModel: Model<ProposalDocument>) {}

  private readonly logger = new Logger(ProposalDataDeliveryService.name);

  rateDelivery = async (
    proposalId: string,
    deliveryInfoId: string,
    subDeliveryId: string,
    rating: SubDeliveryStatus,
  ): Promise<DataDelivery> => {
    if (![SubDeliveryStatus.ACCEPTED, SubDeliveryStatus.REPEATED].includes(rating)) {
      throw new BadRequestException(`Rating '${rating}' is not allowed`);
    }

    const result = await this.proposalModel.findByIdAndUpdate(
      { _id: proposalId },
      {
        $set: {
          'dataDelivery.deliveryInfos.$[outer].subDeliveries.$[inner].status': rating,
        },
      },
      {
        arrayFilters: [{ 'outer._id': deliveryInfoId }, { 'inner._id': subDeliveryId }],
        runValidators: true,
        new: true,
      },
    );

    if (!result) {
      throw new NotFoundException('Proposal not found');
    }

    return result.toObject().dataDelivery;
  };
}
