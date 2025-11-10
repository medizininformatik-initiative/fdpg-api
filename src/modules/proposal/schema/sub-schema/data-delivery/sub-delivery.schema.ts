import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { Location } from 'src/modules/location/schema/location.schema';
import { SubDeliveryStatus } from '../../../enums/data-delivery.enum';

export type SubDeliveryDocument = SubDelivery & Document;

@Schema({ _id: true })
export class SubDelivery {
  _id?: string;

  @Prop({
    type: String,
    ref: () => Location,
  })
  location: string;

  @Prop({ type: String, enum: SubDeliveryStatus, required: true, default: SubDeliveryStatus.PENDING })
  status: SubDeliveryStatus;

  @Prop({ type: Date, default: Date.now, immutable: true })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const SubDeliverySchema = SchemaFactory.createForClass(SubDelivery);

// keep updatedAt consistent
SubDeliverySchema.pre<SubDelivery>('save', function (next) {
  this.updatedAt = new Date();
  next();
});
