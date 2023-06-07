import { Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ParticipantType } from 'src/modules/proposal/enums/participant-type.enum';

export type ParticipantCategoryDocument = ParticipantCategory & Document;

@Schema({ _id: true })
export class ParticipantCategory {
  @Prop(String)
  category: ParticipantType;

  _id: string;

  @Prop({
    type: Boolean,
    default: false,
  })
  isDone: boolean;
}

export const ParticipantCategorySchema = SchemaFactory.createForClass(ParticipantCategory);
