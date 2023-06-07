import { Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Biosample, BiosampleSchema } from './biosample.schema';

export type InformationOnRequestedBioSamplesDocument = InformationOnRequestedBioSamples & Document;

@Schema({ _id: true })
export class InformationOnRequestedBioSamples {
  @Prop([BiosampleSchema])
  biosamples: Biosample[];

  _id?: string;

  @Prop({
    type: Boolean,
    default: false,
  })
  isDone: boolean;
}

export const InformationOnRequestedBioSamplesSchema = SchemaFactory.createForClass(InformationOnRequestedBioSamples);
