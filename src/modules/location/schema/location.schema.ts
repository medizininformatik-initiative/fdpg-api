import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type LocationDocument = Location & Document;

@Schema({ _id: false })
export class Location {
  @Prop({ type: String })
  _id: string;

  @Prop({ required: true, unique: true })
  externalCode: string;

  @Prop({ type: String })
  display: string;

  @Prop({ type: String })
  definition?: string;

  @Prop({ type: String })
  consortium: string;

  @Prop({ type: String })
  contract?: string;

  @Prop({ type: String })
  abbreviation?: string;

  @Prop({ type: String })
  uri?: string;

  @Prop({ type: String })
  rubrum?: string;

  @Prop({ type: Boolean, default: false })
  dataIntegrationCenter: boolean;

  @Prop({ type: Boolean, default: false })
  dataManagementCenter: boolean;

  @Prop({ type: Date })
  deprecationDate?: Date;

  @Prop({ type: Boolean, default: false })
  deprecated: boolean;

  @Prop({ type: Date })
  updated?: Date;
}

export const LocationSchema = SchemaFactory.createForClass(Location);
