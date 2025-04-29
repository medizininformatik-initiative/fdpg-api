import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { PlatformIdentifier } from 'src/modules/admin/enums/platform-identifier.enum';

@Schema({ _id: false })
export class SelectedDataSource {
  @Prop({
    type: [String],
    enum: PlatformIdentifier,
    required: true,
  })
  platform: PlatformIdentifier[];
}

export const SelectedDataSourceSchema = SchemaFactory.createForClass(SelectedDataSource);
