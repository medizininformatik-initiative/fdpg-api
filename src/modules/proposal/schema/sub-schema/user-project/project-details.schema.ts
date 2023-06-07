import { Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Department } from 'src/modules/proposal/enums/department.enum';

export type ProjectDetailsDocument = ProjectDetails & Document;

@Schema({ _id: true })
export class ProjectDetails {
  @Prop()
  simpleProjectDescription: string;
  @Prop([String])
  department: Department[];
  @Prop()
  scientificBackground: string;
  @Prop()
  hypothesisAndQuestionProjectGoals: string;
  @Prop()
  materialAndMethods: string;

  _id?: string;

  @Prop({
    type: Boolean,
    default: false,
  })
  isDone: boolean;
}

export const ProjectDetailsSchema = SchemaFactory.createForClass(ProjectDetails);
