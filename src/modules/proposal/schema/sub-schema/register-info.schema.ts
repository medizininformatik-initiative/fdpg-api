import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class RegisterInfo {
  @Prop({
    type: Boolean,
    default: false,
  })
  isRegisteringForm: boolean;

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
}

export const RegisterInfoSchema = SchemaFactory.createForClass(RegisterInfo);
