import { Country, Currency, Locale, RequestCategory, SellerType, UserRole } from '@prisma/client';
import { Equals, IsBoolean, IsEmail, IsEnum, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { IsPasswordPolicy } from '../common/validators/password-policy.validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsPasswordPolicy()
  password!: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsIn([UserRole.BUYER, UserRole.SELLER, UserRole.BOTH])
  role!: UserRole;

  @IsBoolean()
  @Equals(true, { message: 'Debés aceptar los términos y la política de privacidad' })
  acceptedTerms!: boolean;

  @IsOptional()
  @IsEnum(SellerType)
  sellerType?: SellerType;

  @IsOptional()
  @IsEnum(RequestCategory)
  sellerCategory?: RequestCategory;

  @IsEnum(Country)
  country!: Country;

  @IsOptional()
  @IsEnum(Locale)
  locale?: Locale;

  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}

export class VerifyEmailDto {
  @IsString()
  @MinLength(10)
  token!: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @IsString()
  @MinLength(10)
  token!: string;

  @IsString()
  @IsPasswordPolicy()
  password!: string;
}
