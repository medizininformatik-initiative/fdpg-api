import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Location } from 'src/modules/location/schema/location.schema';

export type AdditionalLocationInformationDocument = AdditionalLocationInformation & Document;

@Schema({ _id: true })
export class AdditionalLocationInformation {
  _id?: string;

  @Prop({ type: String, ref: () => Location })
  location: string;

  @Prop()
  legalBasis: boolean;

  @Prop()
  locationPublicationName: string;

  @Prop({ type: Date, default: Date.now, immutable: true })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now, immutable: false })
  updatedAt: Date;
}

const AdditionalLocationInformationSchema = SchemaFactory.createForClass(AdditionalLocationInformation);

export { AdditionalLocationInformationSchema };
