import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class RegisterInfo {
  @Prop({
    type: Boolean,
    default: false,
  })
  isInternalRegistration: boolean;

  @Prop({
    type: String,
    required: false,
  })
  originalProposalId?: string; // Reference to the original proposal if this is a copy

  // Register-specific fields (moved from generalProjectInformation)
  @Prop({
    type: String,
    required: false,
  })
  projectUrl?: string;

  @Prop({
    type: Boolean,
    default: false,
  })
  legalBasis: boolean;

  @Prop({
    type: String,
    required: false,
  })
  projectCategory?: string;

  @Prop({
    type: [String],
    default: [],
  })
  diagnoses: string[];

  @Prop({
    type: [String],
    default: [],
  })
  procedures: string[];

  _id: string;

  @Prop({
    type: Boolean,
    default: false,
  })
  isDone: boolean;
}

export const RegisterInfoSchema = SchemaFactory.createForClass(RegisterInfo);
