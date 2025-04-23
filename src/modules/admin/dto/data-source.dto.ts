import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum } from 'class-validator';
import { PlatformIdentifier } from '../enums/platform-identifier.enum';
import { Types } from 'mongoose';
import { Transform } from 'class-transformer';

export class DataSourceDto {
  @ApiProperty({ description: 'Unique identifier for the data source' })
  @Transform(({ value }) => value.toString(), { toPlainOnly: true })
  _id: Types.ObjectId;

  @ApiProperty({ description: 'Platform identifier', enum: PlatformIdentifier })
  @IsEnum(PlatformIdentifier)
  tag: PlatformIdentifier;

  @ApiProperty({ description: 'Title translation key for the data source' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Description translation key for the data source' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'External link translation key for the data source' })
  @IsString()
  externalLink: string;
}
