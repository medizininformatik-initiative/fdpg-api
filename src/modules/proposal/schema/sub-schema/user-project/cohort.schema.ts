import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { SelectedCohort, SelectedCohortSchema } from './selected-cohort.schema';

export type CohortDocument = Cohort & Document;

@Schema({ _id: true })
export class Cohort {
  @Prop({ type: [SelectedCohortSchema], default: [] })
  selectedCohorts: SelectedCohort[];

  @Prop()
  details?: string;

  _id?: string;

  @Prop({
    type: Boolean,
    default: false,
  })
  isDone: boolean;
}

export const CohortSchema = SchemaFactory.createForClass(Cohort);
