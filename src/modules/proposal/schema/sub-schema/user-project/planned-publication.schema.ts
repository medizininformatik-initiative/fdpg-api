import { Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Publication, PublicationSchema } from './publication.schema';

export type PlannedPublicationDocument = PlannedPublication & Document;

@Schema({ _id: true })
export class PlannedPublication {
  @Prop([PublicationSchema])
  publications: Publication[];

  _id?: string;

  @Prop({
    type: Boolean,
    default: false,
  })
  isDone: boolean;

  @Prop({
    type: Boolean,
    default: false,
  })
  noPublicationPlanned: boolean;
}

export const PlannedPublicationSchema = SchemaFactory.createForClass(PlannedPublication);
