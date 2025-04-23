import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { PlatformIdentifier } from 'src/modules/admin/enums/platform-identifier.enum';
import { Types } from 'mongoose';

@Schema({ _id: false })
export class SelectedDataSource {
  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: Types.ObjectId, required: true })
  _id: string;

  @Prop({ type: String, required: true })
  description: string;

  @Prop({
    type: String,
    enum: PlatformIdentifier,
    required: true,
  })
  tag: PlatformIdentifier;

  @Prop({ type: String, required: true })
  externalLink: string;
}

export const SelectedDataSourceSchema = SchemaFactory.createForClass(SelectedDataSource);
