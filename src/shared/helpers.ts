// Exceptions
import { DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT } from './constants/global.constants';

export const transformLimit = (limit): number => {
  limit = Number(limit);
  if (isNaN(limit) || limit <= 0 || limit > MAX_PAGE_LIMIT) {
    limit = DEFAULT_PAGE_LIMIT;
  }

  return limit;
};

export const transformPage = (page): number => {
  page = +page;
  if (isNaN(page) || page <= 0) {
    page = 1;
  }

  return page;
};
