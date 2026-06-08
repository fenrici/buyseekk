import { Country, Currency, OperationType, RequestCategory } from '@prisma/client';
import { ArrayMaxSize, IsArray, IsEnum, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { MAX_IMAGES_PER_ENTITY } from '../lib/business-rules';

export class CreateRequestDto {
  @IsEnum(RequestCategory)
  category!: RequestCategory;

  @IsOptional()
  @IsEnum(OperationType)
  operation?: OperationType;

  @IsString()
  @MinLength(5)
  title!: string;

  @IsString()
  @MinLength(10)
  requirements!: string;

  @IsInt()
  @Min(1)
  budget!: number;

  @IsOptional()
  @IsString()
  budgetPeriod?: string;

  @IsEnum(Currency)
  currency!: Currency;

  @IsString()
  @MinLength(2)
  location!: string;

  @IsEnum(Country)
  country!: Country;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_IMAGES_PER_ENTITY)
  @IsString({ each: true })
  imageUrls?: string[];
}
