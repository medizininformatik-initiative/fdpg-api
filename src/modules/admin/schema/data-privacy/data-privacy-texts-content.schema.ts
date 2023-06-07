import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Messages, MessagesSchema } from 'src/shared/schema/messages/messages.schema';

export type DataPrivacyTextsContentDocument = DataPrivacyTextsContent & Document;

@Schema({ _id: false })
export class DataPrivacyTextsContent {
  @Prop(MessagesSchema)
  headline: Messages;

  @Prop(MessagesSchema)
  text: Messages;
}

const DataPrivacyTextsContentSchema = SchemaFactory.createForClass(DataPrivacyTextsContent);

export { DataPrivacyTextsContentSchema };
