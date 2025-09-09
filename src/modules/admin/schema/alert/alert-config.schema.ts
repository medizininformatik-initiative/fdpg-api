import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ConfigType } from '../../enums/config-type.enum';

export type AlertConfigDocument = AlertConfig & Document;

@Schema({ _id: true, collection: 'config' })
export class AlertConfig {
  @Prop({
    type: String,
    enum: ConfigType,
  })
  type: ConfigType.Alert;

  @Prop({ type: String, required: false })
  logoBase64?: string;

  @Prop({ type: Boolean, required: true })
  isVisible: boolean;

  @Prop({ type: String, required: true })
  message: string;

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

const AlertConfigSchema = SchemaFactory.createForClass(AlertConfig);

AlertConfigSchema.index({ type: 1 });

export { AlertConfigSchema };
