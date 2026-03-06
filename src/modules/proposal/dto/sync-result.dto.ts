import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class SyncResultDto {
  @Expose()
  @ApiProperty({
    description: 'Whether the sync operation was successful',
  })
  success: boolean;

  @Expose()
  @ApiProperty({
    description: 'The ID of the synced proposal',
  })
  proposalId: string;

  @Expose()
  @ApiProperty({
    description: 'The project abbreviation of the synced proposal',
  })
  projectAbbreviation: string;

  @Expose()
  @ApiProperty({
    description: 'Error message if sync failed',
    required: false,
  })
  error?: string;
}

export class SyncErrorDto {
  @Expose()
  @ApiProperty({
    description: 'The project abbreviation',
  })
  projectAbbreviation: string;

  @Expose()
  @ApiProperty({
    description: 'Error message',
  })
  error: string;
}

export class BulkSyncResultsDto {
  @Expose()
  @ApiProperty({
    description: 'Total number of proposals processed',
  })
  total: number;

  @Expose()
  @ApiProperty({
    description: 'Number of proposals synced successfully',
  })
  synced: number;

  @Expose()
  @ApiProperty({
    description: 'Number of proposals that failed to sync',
  })
  failed: number;

  @Expose()
  @ApiProperty({
    description: 'Array of errors for failed syncs',
    type: [SyncErrorDto],
    required: false,
  })
  @Type(() => SyncErrorDto)
  errors: SyncErrorDto[];
}
