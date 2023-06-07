import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TermsSlotDocument = TermsSlot & Document;

@Schema({ _id: false })
export class TermsSlot {
  @Prop()
  name: string;

  @Prop()
  label: string;

  @Prop()
  link?: string;
}

const TermsSlotSchema = SchemaFactory.createForClass(TermsSlot);

export { TermsSlotSchema };
