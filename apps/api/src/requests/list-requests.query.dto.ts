import { OperationType, RequestCategory } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { PaginationQueryDto } from '../common/dto/pagination.query.dto';

export class ListRequestsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(RequestCategory)
  category?: RequestCategory;

  @IsOptional()
  @IsEnum(OperationType)
  operation?: OperationType;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  zone?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  bedrooms?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(10)
  @Max(5000)
  minSqm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(10)
  @Max(5000)
  maxSqm?: number;

  @IsOptional()
  @IsString()
  carBrand?: string;

  @IsOptional()
  @IsString()
  carModel?: string;

  @IsOptional()
  @IsString()
  carColor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1990)
  @Max(2100)
  carYearMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(500000)
  maxMileage?: number;
}
