import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { MiiLocation } from 'src/shared/constants/mii-locations';

@Schema({ _id: true })
export class DizDetails {
  @Prop(String)
  location: MiiLocation;

  @Prop()
  localProjectIdentifier?: string;

  @Prop()
  documentationLinks: string;

  _id: string;
}

export const DizDetailsSchema = SchemaFactory.createForClass(DizDetails);
