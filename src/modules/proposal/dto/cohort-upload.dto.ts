import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Transform, Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { IsNotEmptyString } from 'src/shared/validators/is-not-empty-string.validator';

@Exclude()
export class SelectedCohortUploadDto {
  @Expose()
  @IsString()
  @IsNotEmptyString()
  @MaxLength(1000)
  @Transform(({ obj }) => {
    console.log(JSON.parse(obj.newCohort));
    return JSON.parse(obj.newCohort).label;
  })
  label: string;

  @Expose()
  @IsString()
  @IsOptional()
  @MaxLength(10000)
  @Transform(({ obj }) => {
    console.log(JSON.parse(obj.newCohort));
    return JSON.parse(obj.newCohort).comment;
  })
  comment?: string;

  @Expose()
  @IsBoolean()
  @Transform(({ obj }) => {
    console.log(JSON.parse(obj.newCohort));
    return JSON.parse(obj.newCohort).isManualUpload;
  })
  isManualUpload: boolean;

  @Expose()
  @IsNumber()
  @Transform(({ obj }) => {
    console.log(JSON.parse(obj.newCohort));
    return JSON.parse(obj.newCohort).numberOfPatients;
  })
  numberOfPatients: number;
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
