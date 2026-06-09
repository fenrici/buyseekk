import { PaginatedResult, toPaginatedResult } from '@buyseekk/shared';

export type PaginatedResponse<T> = PaginatedResult<T> & { hasNextPage: boolean };

export function toPaginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResponse<T> {
  const base = toPaginatedResult(items, total, page, limit);
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    ...base,
    totalPages,
    hasNextPage: page < totalPages,
  };
}
