import { OfferStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../common/dto/pagination.query.dto';

export class SentOffersQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(OfferStatus)
  status?: OfferStatus;
}
