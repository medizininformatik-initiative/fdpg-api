import { Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Researcher, ResearcherSchema } from './participants/researcher.schema';
import { Institute, InstituteSchema } from './participants/institute.schema';
import { ParticipantCategory, ParticipantCategorySchema } from './participants/participant-category.schema';
import { ParticipantRole, ParticipantRoleSchema } from './participants/participant-role.schema';
import { ProjectResponsibility, ProjectResponsibilitySchema } from './project-responsibility.schema';

export type ProjectResponsibleDocument = ProjectResponsible & Document;

@Schema({ _id: false })
export class ProjectResponsible {
  @Prop({ type: ResearcherSchema })
  researcher: Researcher;

  @Prop({ type: InstituteSchema })
  institute: Institute;

  @Prop({ type: ParticipantCategorySchema })
  participantCategory: ParticipantCategory;

  @Prop({ type: ParticipantRoleSchema })
  participantRole: ParticipantRole;

  @Prop({ type: ProjectResponsibilitySchema })
  projectResponsibility: ProjectResponsibility;
}

export const ProjectResponsibleSchema = SchemaFactory.createForClass(ProjectResponsible);
