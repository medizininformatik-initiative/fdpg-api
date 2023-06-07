import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MessageMapDocument = MessageMap & Document;

@Schema({ _id: false })
export class MessageMap {
  @Prop({
    type: Map,
    of: String,
  })
  en: Record<string, string>;

  @Prop({
    type: Map,
    of: String,
  })
  de: Record<string, string>;
}

const MessageMapSchema = SchemaFactory.createForClass(MessageMap);

export { MessageMapSchema };
