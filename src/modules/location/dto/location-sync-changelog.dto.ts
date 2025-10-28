import { Expose, Type } from 'class-transformer';
import { LocationSyncChangeLogStatus } from '../enum/location-sync-changelog-status.enum';
import { LocationSyncChangelogStrategy } from '../enum/location-sync-changelog-strategy.enum';
import { LocationDto } from './location.dto';
import { IsDate, IsEnum, IsOptional, IsString } from 'class-validator';
import { IsNotEmptyString } from 'src/shared/validators/is-not-empty-string.validator';

export class LocationSyncChangelogDto {
  @Expose()
  @IsString()
  @IsNotEmptyString()
  _id: string;

  @Expose()
  @IsDate()
  created: Date;

  @Expose()
  @IsEnum(LocationSyncChangeLogStatus)
  status: LocationSyncChangeLogStatus;

  @Expose()
  @IsEnum(LocationSyncChangelogStrategy)
  strategy: LocationSyncChangelogStrategy;

  @Expose()
  @IsString()
  @IsNotEmptyString()
  forCode: string;

  @Expose()
  @IsString()
  @IsOptional()
  statusSetBy?: string;

  @Expose()
  @IsDate()
  @IsOptional()
  statusSetDate?: Date;

  @Expose()
  @Type(() => LocationDto)
  @IsOptional()
  oldLocationData?: Omit<LocationDto, 'rubrum'>;

  @Expose()
  @Type(() => LocationDto)
  newLocationData: Omit<LocationDto, 'rubrum'>;
}
