import { Expose, Type } from 'class-transformer';
import { LocationSyncChangeLogStatus } from '../enum/location-sync-changelog-status.enum';
import { LocationSyncChangelogStrategy } from '../enum/location-sync-changelog-strategy.enum';
import { LocationDto } from './location.dto';

export class LocationSyncChangelogDto {
  @Expose()
  _id: string;

  @Expose()
  created: Date;

  @Expose()
  status: LocationSyncChangeLogStatus;

  @Expose()
  strategy: LocationSyncChangelogStrategy;

  @Expose()
  forCode: string;

  @Expose()
  statusSetBy?: string;

  @Expose()
  statusSetDate?: Date;

  @Expose()
  @Type(() => LocationDto)
  oldLocationData?: Omit<LocationDto, 'rubrum'>;

  @Expose()
  @Type(() => LocationDto)
  newLocationData: Omit<LocationDto, 'rubrum'>;
}
