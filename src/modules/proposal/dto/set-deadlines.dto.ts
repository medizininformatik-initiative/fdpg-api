import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsDate, IsEnum, ValidateNested, IsObject } from 'class-validator';
import { DueDateEnum } from '../enums/due-date.enum';
import { Expose, Type } from 'class-transformer';

export class SetDeadlinesDto {
  @Expose()
  @ApiProperty({
    description: 'A map of due dates with their corresponding deadline values.',
    example: {
      DUE_DAYS_FDPG_CHECK: null,
      DUE_DAYS_DATA_CORRUPT: null,
      DUE_DAYS_FINISHED_PROJECT: null,
      DUE_DAYS_LOCATION_CHECK: null,
      DUE_DAYS_EXPECT_DATA_DELIVERY: null,
      DUE_DAYS_LOCATION_CONTRACTING: null,
    },
  })
  @IsOptional()
  @ValidateNested()
  @IsObject()
  @Type(() => Object)
  deadlines?: Partial<Record<DueDateEnum, Date | null>>;

  constructor(partial?: Partial<SetDeadlinesDto>) {
    this.deadlines = {
      [DueDateEnum.DUE_DAYS_FDPG_CHECK]: null,
      [DueDateEnum.DUE_DAYS_DATA_CORRUPT]: null,
      [DueDateEnum.DUE_DAYS_FINISHED_PROJECT]: null,
      [DueDateEnum.DUE_DAYS_LOCATION_CHECK]: null,
      [DueDateEnum.DUE_DAYS_EXPECT_DATA_DELIVERY]: null,
      [DueDateEnum.DUE_DAYS_LOCATION_CONTRACTING]: null,
      ...partial, // Ensure provided values override defaults
    };
  }
}
