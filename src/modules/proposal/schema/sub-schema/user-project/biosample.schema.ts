import { Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type BiosampleDocument = Biosample & Document;

@Schema({ _id: true })
export class Biosample {
  @Prop()
  type: string;

  @Prop()
  count: string;

  @Prop()
  parameter: string;

  @Prop()
  laboratoryResources: string;

  @Prop()
  requirements: string;

  _id: string;
}

export const BiosampleSchema = SchemaFactory.createForClass(Biosample);
