import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Transform } from 'class-transformer';
import { IsBoolean, MaxLength, ValidateIf } from 'class-validator';
import { IsNotEmptyString } from 'src/shared/validators/is-not-empty-string.validator';

// For some reason the values are all strings so they need to be transformed to the desired type
@Exclude()
export class SetUacApprovalDto {
  @Expose()
  @IsBoolean()
  @Transform((params) => (params.value === 'true' || params.value === true ? true : false))
  value: boolean;

  @Expose()
  @ValidateIf(
    (obj: SetUacApprovalDto) =>
      obj.value === true && typeof obj.conditionReasoning === 'string' && obj.conditionReasoning.trim() !== '',
  )
  @MaxLength(10_000)
  conditionReasoning?: string;

  @Expose()
  @ValidateIf((obj: SetUacApprovalDto) => obj.value === false)
  @IsNotEmptyString()
  @MaxLength(10_000)
  declineReason?: string;
}

@Exclude()
export class SetUacApprovalWithFileDto extends SetUacApprovalDto {
  @ApiProperty({
    type: 'string',
    name: 'file',
    required: false,
    nullable: true,
    format: 'binary',
  })
  file: Express.Multer.File;
}
