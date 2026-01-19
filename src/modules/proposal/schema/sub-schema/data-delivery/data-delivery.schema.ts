import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { DeliveryAcceptance } from '../../../enums/data-delivery.enum';
import { DeliveryInfo, DeliveryInfoSchema } from './delivery-info.schema';
import { Location } from 'src/modules/location/schema/location.schema';

export type DataDeliveryDocument = DataDelivery & Document;

@Schema({ _id: false })
export class DataDelivery {
  @Prop({
    type: String,
    ref: () => Location,
  })
  dataManagementSite: string;

  @Prop({ type: String, enum: DeliveryAcceptance, required: true, default: DeliveryAcceptance.PENDING })
  acceptance: DeliveryAcceptance;

  @Prop({ type: [DeliveryInfoSchema], default: [] })
  deliveryInfos: DeliveryInfo[];

  @Prop({ type: Date, default: Date.now, immutable: true })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const DataDeliverySchema = SchemaFactory.createForClass(DataDelivery);

// keep updatedAt consistent
DataDeliverySchema.pre<DataDelivery>('save', function (next) {
  this.updatedAt = new Date();
  next();
});
