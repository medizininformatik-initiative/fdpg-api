import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Transform } from 'class-transformer';
import { IsBoolean, MaxLength, ValidateIf } from 'class-validator';
import { IsNotEmptyString } from 'src/shared/validators/is-not-empty-string.validator';

// For some reason the values are all strings so they need to be transformed to the desired type
@Exclude()
export class SignContractDto {
  @Expose()
  @IsBoolean()
  @Transform((params) => (params.value === 'true' || params.value === true ? true : false))
  value: boolean;

  @Expose()
  @ValidateIf((obj: SignContractDto) => obj.value === false)
  @IsNotEmptyString()
  @MaxLength(10_000)
  declineReason?: string;
}

@Exclude()
export class SignContractWithFileDto extends SignContractDto {
  @ApiProperty({
    type: 'string',
    name: 'file',
    required: false,
    format: 'binary',
    nullable: true,
  })
  file: Express.Multer.File;
}
