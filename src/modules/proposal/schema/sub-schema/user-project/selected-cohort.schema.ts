import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SelectedCohortDocument = SelectedCohort & Document;

@Schema({ _id: true })
export class SelectedCohort {
  @Prop({ type: Number, required: false })
  feasibilityQueryId?: number;

  @Prop({ type: String, required: true })
  label: string;

  @Prop({ type: String, required: false })
  comment?: string;

  @Prop({ type: String, required: false })
  uploadId?: string;

  _id?: string;

  @Prop({ type: Boolean, default: false })
  isManualUpload: boolean;

  @Prop({ type: Number, default: false })
  numberOfPatients?: number;
}

export const SelectedCohortSchema = SchemaFactory.createForClass(SelectedCohort);
