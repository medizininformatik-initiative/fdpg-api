import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { SubDelivery, SubDeliverySchema } from './sub-delivery.schema';

export type DeliveryInfoDocument = DeliveryInfo & Document;

@Schema({ _id: false })
export class DeliveryInfo {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: Date, required: true })
  date: Date;

  @Prop({ type: [SubDeliverySchema], default: [] })
  subDeliveries: SubDelivery[];

  @Prop({ type: String, required: false })
  fhirTaskId?: string;

  @Prop({ type: String, required: false })
  fhirBusinessKey?: string;
}

export const DeliveryInfoSchema = SchemaFactory.createForClass(DeliveryInfo);
