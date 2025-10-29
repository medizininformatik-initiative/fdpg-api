import { Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { CountryCode } from 'src/shared/enums/country-code.enum';
import { Location } from 'src/modules/location/schema/location.schema';

export type InstituteDocument = Institute & Document;

@Schema({ _id: true })
export class Institute {
  @Prop({ type: String, ref: () => Location })
  miiLocation: string;

  @Prop()
  name: string;

  @Prop()
  streetAddress: string;

  @Prop()
  houseNumber: string;

  @Prop()
  postalCode: string;

  @Prop()
  city: string;

  @Prop({ type: String, enum: CountryCode })
  country?: CountryCode;

  @Prop()
  email: string;

  _id: string;

  @Prop({ type: Boolean, default: false })
  isDone: boolean;
}

const InstituteSchema = SchemaFactory.createForClass(Institute);

export { InstituteSchema };
