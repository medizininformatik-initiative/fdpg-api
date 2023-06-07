// Dependencies
import { Transform, TransformFnParams } from 'class-transformer';
import { IsOptional } from 'class-validator';

// Constants
import { DEFAULT_PAGE_LIMIT } from '../constants/global.constants';

// Helpers
import { transformLimit, transformPage } from '../helpers';

/**
 * Export pagination params dto
 *
 * @class PaginationParamsDto
 * */
export class PaginationParamsDto {
  @IsOptional()
  @Transform(
    (page: TransformFnParams) => {
      return transformPage(page.value);
    },
    { toClassOnly: true },
  )
  page?: number = 1;

  @IsOptional()
  @Transform(
    (limit) => {
      return transformLimit(limit.value);
    },
    { toClassOnly: true },
  )
  limit?: number = DEFAULT_PAGE_LIMIT;
}

/**
 * Export pagination dto
 *
 * @class PaginationDto
 * @extends PaginationParamsDto
 * */
export class PaginationDto extends PaginationParamsDto {
  totalPages: number;

  totalCount: number;
}
