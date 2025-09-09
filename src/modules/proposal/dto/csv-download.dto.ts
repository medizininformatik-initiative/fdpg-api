import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class CsvDownloadResponseDto {
  @Expose()
  @ApiProperty({
    description: 'Temporary download URL for the CSV file',
  })
  downloadUrl: string;

  @Expose()
  @ApiProperty({
    description: 'Suggested filename for the download',
  })
  filename: string;

  @Expose()
  @ApiProperty({
    description: 'When the download URL expires',
    format: 'date-time',
  })
  expiresAt: string;
}
