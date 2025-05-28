import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CohortDocument = Cohort & Document;

@Schema({ _id: true })
export class Cohort {
  @Prop()
  feasibilityQueryId: string;

  @Prop()
  label: string;

  @Prop()
  comment: string;

  @Prop()
  uploadId?: string;

  _id: string;
}

const CohortSchema = SchemaFactory.createForClass(Cohort);

export { CohortSchema };
