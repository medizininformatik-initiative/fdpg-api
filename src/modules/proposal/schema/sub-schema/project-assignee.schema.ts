import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProjectAssigneeDocument = ProjectAssignee & Document;

@Schema({ _id: false })
export class ProjectAssignee {
  @Prop({ type: String })
  userId: string;

  @Prop({ type: String })
  firstName?: string;

  @Prop({ type: String })
  lastName?: string;

  @Prop({ type: String })
  email: string;
}

export const ProjectAssigneeSchema = SchemaFactory.createForClass(ProjectAssignee);
