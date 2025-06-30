import { Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ParticipantRoleType } from 'src/modules/proposal/enums/participant-role-type.enum';

export type ParticipantRoleDocument = ParticipantRole & Document;

@Schema({ _id: true })
export class ParticipantRole {
  @Prop(String)
  role: ParticipantRoleType;

  _id: string;

  @Prop({
    type: Boolean,
    default: false,
  })
  isDone: boolean;
}

export const ParticipantRoleSchema = SchemaFactory.createForClass(ParticipantRole);
