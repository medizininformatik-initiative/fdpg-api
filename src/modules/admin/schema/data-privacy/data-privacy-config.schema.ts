import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ConfigType } from '../../enums/config-type.enum';
import { PlatformIdentifier } from '../../enums/platform-identifier.enum';
import { DataPrivacyTexts, DataPrivacyTextsSchema } from './data-privacy-texts.schema';

export type DataPrivacyConfigDocument = DataPrivacyConfig & Document;

@Schema({ _id: true, collection: 'config' })
export class DataPrivacyConfig {
  @Prop({
    type: String,
    enum: ConfigType,
  })
  type: ConfigType.DataPrivacy;

  @Prop({
    type: String,
    enum: PlatformIdentifier,
  })
  platform: PlatformIdentifier;

  @Prop(DataPrivacyTextsSchema)
  messages: DataPrivacyTexts;

  @Prop({
    type: Date,
    default: Date.now,
  })
  updatedAt: Date;

  @Prop({
    type: Date,
    default: Date.now,
    immutable: true,
  })
  createdAt: Date;

  _id: string;
}

const DataPrivacyConfigSchema = SchemaFactory.createForClass(DataPrivacyConfig);

DataPrivacyConfigSchema.index({ platform: 1, type: 1 });

export { DataPrivacyConfigSchema };
