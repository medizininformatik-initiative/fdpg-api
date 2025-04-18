import { Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ProposalTypeOfUse } from '../../../enums/proposal-type-of-use.enum';

export type TypeOfUseDocument = TypeOfUse & Document;

@Schema({ _id: true })
export class TypeOfUse {
  @Prop([String])
  usage: ProposalTypeOfUse[];

  @Prop()
  dataPrivacyExtra?: string;

  @Prop()
  targetFormat?: string;
  @Prop()
  targetFormatOther?: string;

  _id: string;

  @Prop({
    type: Boolean,
    default: false,
  })
  isDone: boolean;
}

export const TypeOfUseSchema = SchemaFactory.createForClass(TypeOfUse);
