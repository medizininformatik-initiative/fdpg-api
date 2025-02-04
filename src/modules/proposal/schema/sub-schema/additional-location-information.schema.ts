import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { MiiLocation } from 'src/shared/constants/mii-locations';

export type AdditionalLocationInformationDocument = AdditionalLocationInformation & Document;

@Schema({ _id: true })
export class AdditionalLocationInformation {
  _id?: string;

  @Prop(String)
  location: MiiLocation;

  @Prop()
  legalBasis: boolean;

  @Prop()
  locationPublicationName: string;

  @Prop({
    type: Date,
    default: Date.now,
    immutable: true,
  })
  createdAt: Date;

  @Prop({
    type: Date,
    default: Date.now,
    immutable: false,
  })
  updatedAt: Date;
}

export const AdditionalLocationInformationSchema = SchemaFactory.createForClass(AdditionalLocationInformation);
