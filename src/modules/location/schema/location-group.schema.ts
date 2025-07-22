import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Location, LocationSchema } from './location.schema';

export type LocationGroupDocument = LocationGroup & Document;

@Schema()
export class LocationGroup {
  @Prop({
    unique: true,
  })
  groupCode: string;

  @Prop([LocationSchema])
  activeLocation?: Location;

  @Prop({ type: [LocationSchema], default: [] })
  deprecatedLocations: Location[];
}

export const LocationGroupSchema = SchemaFactory.createForClass(LocationGroup);
