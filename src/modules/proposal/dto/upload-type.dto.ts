import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { IsEnum } from 'class-validator';

import { DirectUpload } from '../enums/upload-type.enum';

@Exclude()
export class UploadTypeDto {
  @Expose()
  @IsEnum(DirectUpload)
  type: DirectUpload;

  @ApiProperty({
    type: 'string',
    name: 'file',
    format: 'binary',
  })
  file: any;
}
