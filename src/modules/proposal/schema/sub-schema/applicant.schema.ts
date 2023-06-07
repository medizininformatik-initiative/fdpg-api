import { Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Researcher, ResearcherSchema } from './participants/researcher.schema';
import { Institute, InstituteSchema } from './participants/institute.schema';
import { ParticipantCategory, ParticipantCategorySchema } from './participants/participant-category.schema';

export type ApplicantDocument = Applicant & Document;

@Schema({ _id: false })
export class Applicant {
  @Prop({ type: ResearcherSchema })
  researcher: Researcher;

  @Prop({ type: InstituteSchema })
  institute: Institute;

  @Prop({ type: ParticipantCategorySchema })
  participantCategory: ParticipantCategory;
}

export const ApplicantSchema = SchemaFactory.createForClass(Applicant);
