import { Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { CountryCode } from 'src/shared/enums/country-code.enum';
import { MiiLocation } from 'src/shared/constants/mii-locations';

export type InstituteDocument = Institute & Document;

@Schema({ _id: true })
export class Institute {
  @Prop({
    type: String,
    enum: MiiLocation,
  })
  miiLocation: MiiLocation;

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

  @Prop({
    type: String,
    enum: CountryCode,
  })
  country?: CountryCode;

  @Prop()
  email: string;

  _id: string;

  @Prop({
    type: Boolean,
    default: false,
  })
  isDone: boolean;
}

export const InstituteSchema = SchemaFactory.createForClass(Institute);
