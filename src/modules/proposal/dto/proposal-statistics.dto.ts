import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { PanelQuery } from '../enums/panel-query.enum';

export class ProposalCountByPriorityDto {
  @ApiProperty({
    description: 'Number of critical priority proposals (due date passed)',
    example: 2,
  })
  @Expose()
  critical: number;

  @ApiProperty({
    description: 'Number of high priority proposals (has due date)',
    example: 5,
  })
  @Expose()
  high: number;

  @ApiProperty({
    description: 'Number of medium priority proposals',
    example: 3,
  })
  @Expose()
  medium: number;

  @ApiProperty({
    description: 'Number of low priority proposals (no due date)',
    example: 8,
  })
  @Expose()
  low: number;

  @ApiProperty({
    description: 'Total count for this panel',
    example: 18,
  })
  @Expose()
  total: number;
}

export class ProposalStatisticsDto {
  @ApiProperty({
    description: 'Statistics grouped by PanelQuery. Keys are PanelQuery enum values.',
    type: 'object',
    additionalProperties: {
      type: 'object',
      properties: {
        critical: { type: 'number' },
        high: { type: 'number' },
        medium: { type: 'number' },
        low: { type: 'number' },
        total: { type: 'number' },
      },
    },
    example: {
      DRAFT: { critical: 1, high: 2, medium: 0, low: 5, total: 8 },
      RESEARCHER_PENDING: { critical: 0, high: 3, medium: 0, low: 2, total: 5 },
    },
  })
  @Expose()
  panels: Record<PanelQuery, ProposalCountByPriorityDto>;

  @ApiProperty({
    description: 'Total across all panels',
    example: 32,
  })
  @Expose()
  total: number;
}
