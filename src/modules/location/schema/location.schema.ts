import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type LocationDocument = Location & Document;

@Schema({ _id: false })
export class Location {
  @Prop({ type: String })
  _id: string;

  @Prop({ required: true, unique: true })
  externalCode: string;

  display: string;

  defintion?: string;

  consortium: string;

  contract?: string;

  abbreviation?: string;

  @Prop({ type: Boolean, default: false })
  dataIntegrationCenter: boolean;

  @Prop({ type: Boolean, default: false })
  dataManagementCenter: boolean;

  deprecationDate?: Date;

  @Prop({ type: Boolean, default: false })
  deprecated: boolean;
}

export const LocationSchema = SchemaFactory.createForClass(Location);
