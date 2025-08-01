import { Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Researcher, ResearcherSchema } from './participants/researcher.schema';
import { Institute, InstituteSchema } from './participants/institute.schema';
import { ParticipantCategory, ParticipantCategorySchema } from './participants/participant-category.schema';
import { ParticipantRole, ParticipantRoleSchema } from './participants/participant-role.schema';

export type ParticipantDocument = Participant & Document;

@Schema({ _id: true })
export class Participant {
  @Prop({ type: ResearcherSchema })
  researcher: Researcher;

  @Prop({ type: InstituteSchema })
  institute: Institute;

  @Prop({ type: ParticipantCategorySchema })
  participantCategory: ParticipantCategory;

  @Prop({ type: ParticipantRoleSchema })
  participantRole: ParticipantRole;

  @Prop({ type: Boolean, default: false })
  addedByFdpg?: boolean;

  _id: string;
}

export const ParticipantSchema = SchemaFactory.createForClass(Participant);
