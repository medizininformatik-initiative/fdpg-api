import { Expose, Type } from 'class-transformer';
import { LocationSyncChangeLogStatus } from '../enum/location-sync-changelog-status.enum';
import { LocationSyncChangelogStrategy } from '../enum/location-sync-changelog-strategy.enum';
import { LocationGetDto } from './location-get.dto';

export class LocationSyncChangelogGetDto {
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
  @Type(() => LocationGetDto)
  oldLocationData?: Omit<LocationGetDto, 'rubrum'>;

  @Expose()
  @Type(() => LocationGetDto)
  newLocationData: Omit<LocationGetDto, 'rubrum'>;
}
