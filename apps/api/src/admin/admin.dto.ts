import {
  Country,
  OfferStatus,
  ReportReason,
  ReportStatus,
  RequestCategory,
  RequestStatus,
  SecurityEvent,
  UserRole,
} from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

const toBool = ({ value }: { value: unknown }) => {
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  return undefined;
};

/**
 * Paginación del panel admin. No usa @Max: el límite se recorta a 100 en el
 * servicio (parseAdminPagination), para nunca rechazar un limit alto.
 */
export class AdminPaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}

export class ListUsersQueryDto extends AdminPaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  emailVerified?: boolean;

  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  blocked?: boolean;

  @IsOptional()
  @IsEnum(Country)
  country?: Country;

  @IsOptional()
  @IsString()
  createdFrom?: string;

  @IsOptional()
  @IsString()
  createdTo?: string;
}

export class BlockUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class ListAdminRequestsQueryDto extends AdminPaginationQueryDto {
  @IsOptional()
  @IsEnum(RequestCategory)
  category?: RequestCategory;

  @IsOptional()
  @IsEnum(Country)
  country?: Country;

  @IsOptional()
  @IsEnum(RequestStatus)
  status?: RequestStatus;

  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  search?: string;
}

export class ListAdminOffersQueryDto extends AdminPaginationQueryDto {
  @IsOptional()
  @IsEnum(OfferStatus)
  status?: OfferStatus;

  @IsOptional()
  @IsString()
  sellerId?: string;

  @IsOptional()
  @IsString()
  requestId?: string;

  @IsOptional()
  @IsEnum(Country)
  country?: Country;

  @IsOptional()
  @IsString()
  search?: string;
}

export class ListAdminChatsQueryDto extends AdminPaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;
}

export class AdminChatMessagesQueryDto extends AdminPaginationQueryDto {}

export class ListReportsQueryDto extends AdminPaginationQueryDto {
  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus;

  @IsOptional()
  @IsEnum(ReportReason)
  reason?: ReportReason;

  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  autoTriggered?: boolean;
}

export class UpdateReportStatusDto {
  @IsEnum(ReportStatus)
  status!: ReportStatus;
}

export class ListSecurityLogsQueryDto extends AdminPaginationQueryDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsEnum(SecurityEvent)
  event?: SecurityEvent;

  @IsOptional()
  @IsString()
  ip?: string;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;
}
