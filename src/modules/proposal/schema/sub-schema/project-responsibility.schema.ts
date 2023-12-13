import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProjectResponsibilityDocument = ProjectResponsibility & Document;

@Schema({ _id: true })
export class ProjectResponsibility {
  @Prop({
    type: Boolean,
    default: false,
  })
  applicantIsProjectResponsible: boolean;

  @Prop({
    type: Boolean,
    default: false,
  })
  isDone: boolean;

  _id: string;
}
export const ProjectResponsibilitySchema = SchemaFactory.createForClass(ProjectResponsibility);
