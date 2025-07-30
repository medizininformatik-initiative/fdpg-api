import { Schema, SchemaFactory } from '@nestjs/mongoose';

export type LocationDocument = Location & Document;

@Schema()
export class Location {

  identifier: string;

  externalCode: string;

  name: string;

  city?: string;

  consortium: string;

  trv?: string;

  dataManagementCenter: boolean;

  deprecationDate?: Date;
}

export const LocationSchema = SchemaFactory.createForClass(Location);
