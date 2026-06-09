import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

const DEFAULT_MESSAGES_LIMIT = 30;
const MAX_MESSAGES_LIMIT = 100;

export class ChatDetailQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  messagesPage?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_MESSAGES_LIMIT)
  messagesLimit?: number;
}

export function resolveMessagesPagination(
  total: number,
  page?: number,
  limit?: number,
): { page: number; limit: number; skip: number } {
  const safeLimit = Math.min(MAX_MESSAGES_LIMIT, Math.max(1, limit ?? DEFAULT_MESSAGES_LIMIT));
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));
  const safePage = Math.min(Math.max(1, page ?? totalPages), totalPages);
  const skip = (safePage - 1) * safeLimit;
  return { page: safePage, limit: safeLimit, skip };
}
