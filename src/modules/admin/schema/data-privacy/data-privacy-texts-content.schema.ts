import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DataPrivacyTextsContentDocument = DataPrivacyTextsContent & Document;

@Schema({ _id: false })
export class DataPrivacyTextsContent {
  @Prop({ type: String })
  headline: string;

  @Prop({ type: String })
  text: string;
}

const DataPrivacyTextsContentSchema = SchemaFactory.createForClass(DataPrivacyTextsContent);

export { DataPrivacyTextsContentSchema };
