import { IsArray, IsEnum, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Expose, Transform, Type } from 'class-transformer';
import { DataSourceStatus } from '../enum/data-source-status.enum';
import { Language } from 'src/shared/enums/language.enum';

/**
 * Language-specific text entry
 */
export class DataSourceLanguageDto {
  @Expose()
  @IsEnum(Language)
  language: Language;

  @Expose()
  @IsString()
  value: string;
}

/**
 * Data Transfer Object for DataSource entity
 */
export class DataSourceDto {
  @Expose({ name: '_id' })
  @Transform(({ value }) => value?.toString())
  @IsString()
  id: string;

  @Expose()
  @IsString()
  nfdi4healthId: string;

  @Expose()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DataSourceLanguageDto)
  titles: DataSourceLanguageDto[];

  @Expose()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DataSourceLanguageDto)
  descriptions: DataSourceLanguageDto[];

  @Expose()
  @IsString()
  collection: string;

  @Expose()
  @IsNumber()
  collectionId: number;

  @Expose()
  @IsString()
  classification: string;

  @Expose()
  @IsEnum(DataSourceStatus)
  status: DataSourceStatus;

  @Expose()
  @IsOptional()
  approvalDate?: Date;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}

/**
 * Pagination parameters for DataSource queries
 */
export class DataSourcePaginationParamsDto {
  @IsNumber()
  @Min(1)
  page: number;

  @IsNumber()
  @Min(1)
  pageSize: number;
}

/**
 * Search parameters for DataSource queries
 */
export class DataSourceSearchParamsDto {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsEnum(DataSourceStatus)
  status?: DataSourceStatus;
}

/**
 * Paginated search results for DataSource entities
 */
export class DataSourcePaginatedResultDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DataSourceDto)
  data: DataSourceDto[];

  @IsNumber()
  total: number;

  @IsNumber()
  page: number;

  @IsNumber()
  pageSize: number;

  @IsNumber()
  totalPages: number;
}
