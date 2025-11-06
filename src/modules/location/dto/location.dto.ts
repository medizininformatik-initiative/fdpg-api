import { Expose } from 'class-transformer';
import { IsBoolean, IsDate, IsOptional, IsString } from 'class-validator';
import { IsNotEmptyString } from 'src/shared/validators/is-not-empty-string.validator';

export class LocationDto {
  @Expose()
  @IsString()
  @IsNotEmptyString()
  _id: string;

  @Expose()
  @IsString()
  @IsNotEmptyString()
  externalCode: string;

  @Expose()
  @IsString()
  @IsNotEmptyString()
  display: string;

  @Expose()
  @IsString()
  @IsOptional()
  definition?: string;

  @Expose()
  @IsString()
  @IsNotEmptyString()
  consortium: string;

  @Expose()
  @IsString()
  @IsOptional()
  contract?: string;

  @Expose()
  @IsString()
  @IsOptional()
  abbreviation?: string;

  @Expose()
  @IsString()
  @IsOptional()
  uri?: string;

  @Expose()
  @IsString()
  @IsOptional()
  rubrum?: string;

  @Expose()
  @IsBoolean()
  dataIntegrationCenter: boolean;

  @Expose()
  @IsString()
  @IsBoolean()
  dataManagementCenter: boolean;

  @Expose()
  @IsDate()
  @IsOptional()
  deprecationDate?: Date;

  @Expose()
  @IsBoolean()
  @IsOptional()
  deprecated: boolean;
}

export class LocationKeyLabelDto {
  _id: string;
  display: string;
}
