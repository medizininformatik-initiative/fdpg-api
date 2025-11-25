import { Expose } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { IsNotEmptyString } from 'src/shared/validators/is-not-empty-string.validator';

export class MiiCodesystemLocationDto {
  @Expose()
  @IsString()
  @IsNotEmptyString()
  code: string;

  @Expose()
  @IsString()
  @IsOptional()
  display?: string;

  @Expose()
  @IsString()
  @IsOptional()
  definition?: string;

  @Expose()
  @IsString()
  @IsOptional()
  consortium?: string;

  @Expose()
  @IsString()
  @IsOptional()
  uri?: string;

  @Expose()
  @IsString()
  @IsNotEmptyString()
  status?: 'active' | 'deprecated';

  @Expose()
  @IsString()
  @IsOptional()
  contract?: string;

  @Expose()
  @IsString()
  @IsOptional()
  abbreviation?: string;

  @Expose()
  @IsBoolean()
  dic: boolean; // boolean flag if this location is a DIZ / data integration center

  @Expose()
  @IsBoolean()
  dataManagement: boolean; // boolean flag if this location is a data management location

  @Expose()
  @IsBoolean()
  deprecationDate?: string;

  @Expose()
  @IsString()
  @IsOptional()
  replaces?: string; // code of the location that is replaced by this location

  @Expose()
  @IsString()
  @IsOptional()
  replacedBy?: string; // code of the location that was replaced by this location
}
