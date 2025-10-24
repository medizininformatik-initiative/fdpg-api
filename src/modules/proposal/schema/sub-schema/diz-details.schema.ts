import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Location } from 'src/modules/location/schema/location.schema';

@Schema({ _id: true })
export class DizDetails {
  @Prop({ type: String, ref: () => Location })
  location: string;

  @Prop()
  localProjectIdentifier?: string;

  @Prop()
  documentationLinks: string;

  _id: string;
}

const DizDetailsSchema = SchemaFactory.createForClass(DizDetails);

export { DizDetailsSchema };
