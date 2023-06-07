import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Transform, Type } from 'class-transformer';
import { ExposeId } from 'src/shared/decorators/transform/expose-id.decorator';
import { Types } from 'mongoose';
import { UploadDto, UploadGetDto } from '../upload.dto';
import { ExposeUpload } from '../../decorators/expose-uploads.decorator';
import { IsArray, MaxLength, ValidateNested } from 'class-validator';
import { IsNotEmptyString } from 'src/shared/validators/is-not-empty-string.validator';
import { FileDto } from 'src/shared/dto/file.dto';

@Exclude()
export class ReportBaseDto {
  @Expose()
  @MaxLength(250)
  @IsNotEmptyString()
  title: string;

  @Expose()
  @MaxLength(10000)
  @IsNotEmptyString()
  @ApiProperty({
    description: 'The content of a report is only delivered when requesting a single report',
  })
  content: string;
}

@Exclude()
export class ReportCreateDto extends ReportBaseDto {}

@Exclude()
export class ReportUpdateDto extends ReportBaseDto {
  @Expose()
  @Transform(({ value }) => {
    if (value === null || value === undefined) {
      return [];
    } else if (Array.isArray(value)) {
      return value;
    } else {
      return value.length ? value.split(',') : [];
    }
  })
  keepUploads: string[];
}

@Exclude()
export class ReportGetDto extends ReportBaseDto {
  @ExposeId()
  _id: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @ExposeUpload()
  uploads: UploadGetDto[];
}

@Exclude()
export class ReportCreateWithFilesDto extends ReportCreateDto {
  @Expose()
  @ApiProperty({
    type: 'file',
    name: 'files',
    required: false,
    isArray: true,
    properties: {
      files: {
        type: 'string',
        format: 'binary',
        nullable: true,
      },
    },
  })
  @Type(() => FileDto)
  @IsArray()
  @ValidateNested({ each: true })
  files: FileDto[];
}

@Exclude()
export class ReportUpdateWithFilesDto extends ReportUpdateDto {
  @Expose()
  @ApiProperty({
    type: 'file',
    name: 'files',
    required: false,
    isArray: true,
    properties: {
      files: {
        items: {
          type: 'string',
          format: 'binary',
          nullable: true,
        },
      },
    },
  })
  @Type(() => FileDto)
  @IsArray()
  @ValidateNested({ each: true })
  files: FileDto[];
}

export class ReportDto extends ReportGetDto {
  constructor(report: ReportCreateDto) {
    super();
    const now = new Date();
    this._id = new Types.ObjectId().toString();
    this.title = report.title;
    this.content = report.content;
    this.createdAt = now;
    this.updatedAt = now;
    this.uploads = [];
  }

  uploads: UploadDto[];
}
