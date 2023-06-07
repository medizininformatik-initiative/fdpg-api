import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ProjectUserType } from '../../enums/project-user-type.enum';

export type ProjectUserDocument = ProjectUser & Document;

@Schema({ _id: true })
export class ProjectUser {
  @Prop(String)
  projectUserType: ProjectUserType;

  _id: string;

  @Prop({
    type: Boolean,
    default: false,
  })
  isDone: boolean;
}

export const ProjectUserSchema = SchemaFactory.createForClass(ProjectUser);
