import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { TermsSlot, TermsSlotSchema } from './terms-slot.schema';

export type TermsDocument = Terms & Document;

@Schema({ _id: false })
export class Terms {
  @Prop()
  label: string;

  @Prop([TermsSlotSchema])
  slots: TermsSlot[];
}

const TermsSchema = SchemaFactory.createForClass(Terms);

export { TermsSchema };
