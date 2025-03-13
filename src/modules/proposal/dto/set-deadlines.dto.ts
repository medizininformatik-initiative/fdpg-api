import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, ValidateNested, IsObject } from 'class-validator';
import { DueDateEnum, defaultDueDateValues } from '../enums/due-date.enum';
import { Expose, Type } from 'class-transformer';

export class SetDeadlinesDto {
  @Expose()
  @ApiProperty({
    description: 'A map of due dates with their corresponding deadline values.',
    example: {
      ...defaultDueDateValues,
    },
  })
  @IsOptional()
  @ValidateNested()
  @IsObject()
  @Type(() => Object)
  deadlines?: Partial<Record<DueDateEnum, Date | null>>;

  constructor(partial?: Partial<SetDeadlinesDto>) {
    this.deadlines = {
      ...defaultDueDateValues,
      ...partial, // Ensure provided values override defaults
    };
  }
}
