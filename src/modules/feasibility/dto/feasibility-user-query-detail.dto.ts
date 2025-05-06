import { Exclude, Expose, Transform, Type } from 'class-transformer';

@Exclude()
export class FeasibilityUserQueryDetailCcdlDataSelectionDto {
  @Expose()
  exists: boolean;

  @Expose()
  isValid: boolean;
}

@Exclude()
export class FeasibilityUserQueryDetailDto {
  @Expose()
  id: number;

  @Expose()
  label: string;

  @Expose()
  comment: string;

  @Expose()
  @Transform(({ value }) => new Date(value))
  lastModified: Date;

  @Expose()
  resultSize: number;

  @Expose()
  @Type(() => FeasibilityUserQueryDetailCcdlDataSelectionDto)
  ccdl: FeasibilityUserQueryDetailCcdlDataSelectionDto;

  @Expose()
  @Type(() => FeasibilityUserQueryDetailCcdlDataSelectionDto)
  dataSelection: FeasibilityUserQueryDetailCcdlDataSelectionDto;
}
