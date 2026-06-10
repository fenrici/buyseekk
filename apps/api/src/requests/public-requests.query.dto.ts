import { Country, RequestCategory } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../common/dto/pagination.query.dto';

export class PublicRequestsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(RequestCategory)
  category?: RequestCategory;

  @IsOptional()
  @IsEnum(Country)
  country?: Country;

  @IsOptional()
  @IsString()
  location?: string;
}
