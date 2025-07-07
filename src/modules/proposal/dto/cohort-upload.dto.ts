import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Transform, Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { IsNotEmptyString } from 'src/shared/validators/is-not-empty-string.validator';

export class AutomaticSelectedCohortUploadDto {
  @Expose()
  @IsString()
  @IsNotEmptyString()
  @MaxLength(1000)
  @Transform(({ obj }) => {
    return obj.newCohort?.label;
  })
  label: string;

  @Expose()
  @IsNumber()
  @Transform(({ obj }) => {
    return obj.newCohort?.feasibilityQueryId;
  })
  feasibilityQueryId: number;

  @Expose()
  @IsString()
  @IsOptional()
  @MaxLength(10000)
  @Transform(({ obj }) => {
    return obj.newCohort?.comment;
  })
  comment?: string;

  @Expose()
  @IsBoolean()
  @Transform(({ obj }) => {
    return obj.newCohort?.isManualUpload;
  })
  isManualUpload: boolean;

  @Expose()
  @IsNumber()
  @IsOptional()
  @Transform(({ obj }) => {
    return obj.newCohort?.numberOfPatients;
  })
  numberOfPatients?: number;
}

@Exclude()
export class SelectedCohortUploadDto {
  @Expose()
  @IsString()
  @IsNotEmptyString()
  @MaxLength(1000)
  @Transform(({ obj }) => {
    return obj.newCohort ? JSON.parse(obj.newCohort).label : undefined;
  })
  label: string;

  @Expose()
  @IsString()
  @IsOptional()
  @MaxLength(10000)
  @Transform(({ obj }) => {
    return obj.newCohort ? JSON.parse(obj.newCohort).comment : undefined;
  })
  comment?: string;

  @Expose()
  @IsBoolean()
  @Transform(({ obj }) => {
    return obj.newCohort ? JSON.parse(obj.newCohort).isManualUpload : undefined;
  })
  isManualUpload: boolean;

  @Expose()
  @IsNumber()
  @IsOptional()
  @Transform(({ obj }) => {
    return obj.newCohort ? JSON.parse(obj.newCohort).numberOfPatients : undefined;
  })
  numberOfPatients?: number;
}

@Exclude()
export class CohortUploadDto {
  @ApiProperty({
    type: 'string',
    name: 'file',
    format: 'binary',
  })
  file: any;

  @Expose()
  @Type(() => SelectedCohortUploadDto)
  @ValidateNested()
  newCohort: SelectedCohortUploadDto;
}
