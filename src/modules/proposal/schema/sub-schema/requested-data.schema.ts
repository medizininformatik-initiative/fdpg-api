import { Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type RequestedDataDocument = RequestedData & Document;

@Schema({ _id: true })
export class RequestedData {
  @Prop()
  patientInfo: string;

  @Prop()
  dataInfo: string;

  @Prop()
  desiredDataAmount: number;

  @Prop()
  desiredControlDataAmount: number;

  _id: string;

  @Prop({
    type: Boolean,
    default: false,
  })
  isDone: boolean;
}

export const RequestedDataSchema = SchemaFactory.createForClass(RequestedData);
