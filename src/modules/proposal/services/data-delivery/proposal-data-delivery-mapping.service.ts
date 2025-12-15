import { Injectable } from '@nestjs/common';
import { DeliveryInfoUpdateDto } from '../../dto/proposal/data-delivery/delivery-info.dto';
import { DeliveryInfo } from '../../schema/sub-schema/data-delivery/delivery-info.schema';
import { SubDelivery } from '../../schema/sub-schema/data-delivery/sub-delivery.schema';
import { SubDeliveryUpdateDto } from '../../dto/proposal/data-delivery/sub-delivery.dto';

@Injectable()
export class ProposalDataDeliveryMappingService {
  constructor() {}

  mapToDeliveryInfoModel = (dtos: DeliveryInfoUpdateDto[] | null | undefined): DeliveryInfo[] | null => {
    if (dtos === undefined || dtos === null) return null;

    return dtos.map((dto) => ({
      _id: dto._id,
      name: dto.name,
      deliveryDate: dto.deliveryDate,
      status: dto.status,
      dms: dto.dms,
      manualEntry: dto.manualEntry,
      subDeliveries: (dto.subDeliveries || []).map(this.mapToSubDeliveryModel),
    }));
  };

  mapToSubDeliveryModel = (dto: SubDeliveryUpdateDto): SubDelivery => {
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
