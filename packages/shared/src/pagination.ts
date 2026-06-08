import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from './limits';

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function parsePagination(page?: number, limit?: number) {
  const safePage = Math.max(1, page ?? 1);
  const safeLimit = Math.min(MAX_PAGE_SIZE, Math.max(1, limit ?? DEFAULT_PAGE_SIZE));
  const skip = (safePage - 1) * safeLimit;
  return { page: safePage, limit: safeLimit, skip };
}

export function toPaginatedResult<T>(items: T[], total: number, page: number, limit: number): PaginatedResult<T> {
  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
