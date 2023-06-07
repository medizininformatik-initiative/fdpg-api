import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ConfigType } from '../../enums/config-type.enum';
import { PlatformIdentifier } from '../../enums/platform-identifier.enum';
import { MessageMap, MessageMapSchema } from '../../../../shared/schema/messages/messages-map.schema';
import { Terms, TermsSchema } from './terms.schema';

export type TermsConfigDocument = TermsConfig & Document;

@Schema({ _id: true, collection: 'config' })
export class TermsConfig {
  @Prop({
    type: String,
    enum: ConfigType,
  })
  type: ConfigType.TermsDialog;

  @Prop({
    type: String,
    enum: PlatformIdentifier,
  })
  platform: PlatformIdentifier;

  @Prop([TermsSchema])
  terms: Terms[];

  @Prop(MessageMapSchema)
  messages: MessageMap;

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

const TermsConfigSchema = SchemaFactory.createForClass(TermsConfig);

TermsConfigSchema.index({ platform: 1, type: 1 });

export { TermsConfigSchema };
