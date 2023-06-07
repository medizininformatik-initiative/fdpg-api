import { Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type ResearcherDocument = Researcher & Document;

@Schema({ _id: true })
export class Researcher {
  @Prop()
  title: string;

  @Prop()
  firstName: string;

  @Prop()
  lastName: string;

  @Prop()
  affiliation: string;

  @Prop()
  email: string;

  _id: string;

  @Prop({
    type: Boolean,
    default: false,
  })
  isDone: boolean;
}

export const ResearcherSchema = SchemaFactory.createForClass(Researcher);
