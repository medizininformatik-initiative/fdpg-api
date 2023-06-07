import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Upload, UploadSchema } from './upload.schema';

export type ReportDocument = Report & Document;

@Schema({ _id: true })
export class Report {
  _id: string;

  @Prop()
  title: string;

  @Prop()
  content: string;

  @Prop({ type: [UploadSchema], default: [] })
  uploads: Upload[];

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

export const ReportSchema = SchemaFactory.createForClass(Report);
