import { Currency } from '@prisma/client';
import { ArrayMaxSize, IsArray, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { MAX_IMAGES_PER_ENTITY, OFFER_MESSAGE_MAX_LENGTH } from '@buyseekk/shared';

export class CreateOfferDto {
  @IsString()
  requestId!: string;

  @IsInt()
  @Min(1)
  price!: number;

  @IsEnum(Currency)
  currency!: Currency;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(OFFER_MESSAGE_MAX_LENGTH)
  message!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_IMAGES_PER_ENTITY)
  @IsString({ each: true })
  imageUrls?: string[];
}
