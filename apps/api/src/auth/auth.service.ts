import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Country, Currency, Locale, User, UserMode, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { defaultCurrencyForCountry, defaultLocaleForCountry } from '@buyseekk/shared';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  private toPublicUser(user: User) {
    const { passwordHash: _, ...safe } = user;
    return safe;
  }

  private signToken(user: User) {
    return this.jwt.sign(
      { sub: user.id, email: user.email },
      { expiresIn: this.config.get('JWT_EXPIRES_IN', '7d') },
    );
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email ya registrado');

    const isSeller = dto.role === UserRole.SELLER || dto.role === UserRole.BOTH;
    if (isSeller) {
      if (!dto.sellerType || !dto.sellerCategory) {
        throw new BadRequestException('Los vendedores deben indicar tipo y rubro');
      }
    } else if (dto.sellerType || dto.sellerCategory) {
      throw new BadRequestException('Solo los vendedores pueden indicar tipo y rubro');
    }

    const locale =
      dto.locale ??
      (defaultLocaleForCountry(dto.country as 'AR' | 'US') === 'en' ? Locale.EN : Locale.ES);
    const currency =
      dto.currency ??
      (defaultCurrencyForCountry(dto.country as 'AR' | 'US') === 'USD' ? Currency.USD : Currency.ARS);

    // Toda cuenta puede comprar. Si elige vendedor, habilitamos ambas capacidades (BOTH)
    // y arrancamos en modo vendedor; de lo contrario es comprador.
    const role = isSeller ? UserRole.BOTH : UserRole.BUYER;
    const activeMode = isSeller ? UserMode.SELLER : UserMode.BUYER;

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        role,
        activeMode,
        sellerType: isSeller ? dto.sellerType : null,
        sellerCategory: isSeller ? dto.sellerCategory : null,
        country: dto.country,
        locale,
        currency,
      },
    });

    return { user: this.toPublicUser(user), token: this.signToken(user) };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Credenciales inválidas');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Credenciales inválidas');

    return { user: this.toPublicUser(user), token: this.signToken(user) };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return this.toPublicUser(user);
  }
}
