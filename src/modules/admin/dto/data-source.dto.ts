import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { PlatformIdentifier } from '../enums/platform-identifier.enum';

export class DataSourceItemDto {
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

export type DataSourceDto = {
  [key in PlatformIdentifier]: DataSourceItemDto;
};
