import { Expose } from 'class-transformer';
import { IsOptional } from 'class-validator';
import { DEFAULT_SORT_BY, OrderDirection } from '../constants/global.constants';

/**
 * Sort: Order and By
 */
export class SortOrderDto {
  /** Sort Direction */
  @IsOptional()
  @Expose()
  order?: OrderDirection = OrderDirection.DESC;

  /** Sort by key */
  @IsOptional()
  @Expose()
  sortBy?: string = DEFAULT_SORT_BY;
}
