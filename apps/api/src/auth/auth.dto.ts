import { Country, Currency, Locale, RequestCategory, SellerType, UserRole } from '@prisma/client';
import { Equals, IsBoolean, IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsEnum(UserRole)
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

export class RefreshTokenDto {
  @IsString()
  @MinLength(10)
  refreshToken!: string;
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
  @MinLength(6)
  password!: string;
}
