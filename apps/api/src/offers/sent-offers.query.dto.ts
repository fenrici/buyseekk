import { OfferStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../common/dto/pagination.query.dto';

export class OffersListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(OfferStatus)
  status?: OfferStatus;
}

export class SentOffersQueryDto extends OffersListQueryDto {}
