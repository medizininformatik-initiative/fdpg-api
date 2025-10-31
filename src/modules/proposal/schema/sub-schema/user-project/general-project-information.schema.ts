import { Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type GeneralProjectInformationDocument = GeneralProjectInformation & Document;

@Schema({ _id: true })
export class GeneralProjectInformation {
  @Prop()
  projectTitle: string;

  @Prop()
  desiredStartTime: Date;

  @Prop()
  projectDuration: number;

  @Prop()
  projectFunding: string;

  @Prop()
  fundingReferenceNumber: string;

  @Prop()
  desiredStartTimeType: string;

  @Prop({
    type: [String],
    default: [],
  })
  keywords: string[];

  _id: string;

  @Prop({
    type: Boolean,
    default: false,
  })
  isDone: boolean;
}

export const GeneralProjectInformationSchema = SchemaFactory.createForClass(GeneralProjectInformation);
