import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CohortDocument = Cohort & Document;

@Schema({ _id: true })
export class Cohort {
  @Prop()
  id: string;

  @Prop()
  label: string;

  @Prop()
  comment: string;

  @Prop()
  file?: string;

  _id: string;
}

const CohortSchema = SchemaFactory.createForClass(Cohort);

export { CohortSchema };
