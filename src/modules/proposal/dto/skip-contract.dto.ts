import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Transform } from 'class-transformer';
import { IsArray, IsString } from 'class-validator';

// For some reason the values are all strings so they need to be transformed to the desired type
@Exclude()
export class SkipContractDto {
  @Expose()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return [];
      }
    }
    return value;
  })
  @IsArray()
  @IsString({ each: true })
  locations: string[];
}

@Exclude()
export class SkipContractWithFileDto extends SkipContractDto {
  @ApiProperty({
    type: 'string',
    name: 'file',
    required: false,
    format: 'binary',
    nullable: true,
  })
  file: Express.Multer.File;
}
