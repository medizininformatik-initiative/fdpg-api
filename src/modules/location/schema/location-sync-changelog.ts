import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Location } from './location.schema';
import { LocationSyncChangeLogStatus } from '../enum/location-sync-changelog-status.enum';
import { LocationSyncChangelogStrategy } from '../enum/location-sync-changelog-strategy.enum';

export type LocationSyncChangelogDocument = LocationSyncChangelog & Document;

type LocationData = Omit<Location, 'rubrum'>;

@Schema({ _id: true })
export class LocationSyncChangelog {
  _id: string;

  @Prop({ type: Date, required: true })
  created: Date;

  @Prop({ type: String, enum: LocationSyncChangeLogStatus })
  status: LocationSyncChangeLogStatus;

  @Prop({ type: String, enum: LocationSyncChangelogStrategy })
  strategy: LocationSyncChangelogStrategy;

  @Prop({ type: String, required: true })
  forCode: string;

  @Prop({ type: String })
  statusSetBy?: string;

  @Prop({ type: Date })
  statusSetDate?: Date;

  @Prop({ type: Object, required: false })
  oldLocationData?: LocationData;

  @Prop({ type: Object, required: true })
  newLocationData: LocationData;
}

export const LocationSyncChangelogSchema = SchemaFactory.createForClass(LocationSyncChangelog);
