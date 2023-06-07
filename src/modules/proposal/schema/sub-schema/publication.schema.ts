import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PublicationDocument = Publication & Document;

@Schema({ _id: true })
export class Publication {
  _id?: string;

  @Prop()
  title: string;

  @Prop()
  doi?: string;

  @Prop()
  link?: string;

  @Prop({
    type: Date,
    default: Date.now,
    immutable: true,
  })
  createdAt: Date;

  @Prop({
    type: Date,
    default: Date.now,
    immutable: true,
  })
  updatedAt: Date;
}

export const PublicationSchema = SchemaFactory.createForClass(Publication);
