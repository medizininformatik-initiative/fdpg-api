import { Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { PublicationType } from '../../../enums/publication-type.enum';
export type PublicationDocument = Publication & Document;

@Schema({ _id: true })
export class Publication {
  @Prop({
    type: String,
    enum: PublicationType,
  })
  type: PublicationType;

  @Prop()
  description: string;

  @Prop()
  authors: string;

  _id: string;
}

export const PublicationSchema = SchemaFactory.createForClass(Publication);
