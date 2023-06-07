import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MessagesDocument = Messages & Document;

@Schema({ _id: false })
export class Messages {
  @Prop()
  en: string;

  @Prop()
  de: string;
}

const MessagesSchema = SchemaFactory.createForClass(Messages);

export { MessagesSchema };
