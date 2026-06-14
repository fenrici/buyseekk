/** Paginación específica del panel admin (independiente de la del marketplace). */
export const ADMIN_DEFAULT_LIMIT = 25;
export const ADMIN_MAX_LIMIT = 100;

export interface AdminPaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface AdminPaginated<T> {
  items: T[];
  meta: AdminPaginationMeta;
}

/** Normaliza page/limit: page mínimo 1, limit default 25, máximo 100. */
export function parseAdminPagination(page?: number, limit?: number) {
  const safePage = Math.max(1, Math.floor(page ?? 1));
  const rawLimit = Math.floor(limit ?? ADMIN_DEFAULT_LIMIT);
  const safeLimit = Math.min(ADMIN_MAX_LIMIT, Math.max(1, rawLimit));
  const skip = (safePage - 1) * safeLimit;
  return { page: safePage, limit: safeLimit, skip };
}

export function toAdminPaginated<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
): AdminPaginated<T> {
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    items,
    meta: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1 && total > 0,
    },
  };
}
