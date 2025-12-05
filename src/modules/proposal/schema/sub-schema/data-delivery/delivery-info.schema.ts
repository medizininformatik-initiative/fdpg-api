import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { SubDelivery, SubDeliverySchema } from './sub-delivery.schema';
import { DeliveryInfoStatus } from 'src/modules/proposal/enums/delivery-info-status.enum';
import { ForbiddenException } from '@nestjs/common';

export type DeliveryInfoDocument = DeliveryInfo & Document;

@Schema({ _id: true })
export class DeliveryInfo {
  _id?: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: Date, required: true })
  deliveryDate: Date;

  @Prop({ type: String, enum: DeliveryInfoStatus, required: true, default: DeliveryInfoStatus.PENDING })
  status: DeliveryInfoStatus;

  @Prop({ type: [SubDeliverySchema], default: [] })
  subDeliveries: SubDelivery[];

  @Prop({ type: Date, default: Date.now })
  lastSynced?: Date;

  @Prop({ type: Date, default: Date.now, immutable: true })
  createdAt?: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt?: Date;

  @Prop({ type: String, required: false })
  fhirTaskId?: string;

  @Prop({ type: String, required: false })
  fhirBusinessKey?: string;
}

export const DeliveryInfoSchema = SchemaFactory.createForClass(DeliveryInfo);

DeliveryInfoSchema.pre<DeliveryInfo>('save', function (next) {
  this.updatedAt = new Date();
  next();
});

DeliveryInfoSchema.pre<DeliveryInfo>('save', function (next) {
  if (this.status !== DeliveryInfoStatus.PENDING) {
    throw new ForbiddenException('Cannot update delivery info when it was finished');
  }
});
