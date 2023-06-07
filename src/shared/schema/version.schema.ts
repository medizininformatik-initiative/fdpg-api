import { Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type VersionDocument = Version & Document;

@Schema({ _id: false })
export class Version {
  @Prop({
    type: Number,
    default: 0,
  })
  mayor: number;

  @Prop({
    type: Number,
    default: 0,
  })
  minor: number;
}

export const VersionSchema = SchemaFactory.createForClass(Version);
