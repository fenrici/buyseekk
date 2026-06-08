import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Country, Currency, Locale, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { defaultCurrencyForCountry, defaultLocaleForCountry } from '../lib/business-rules';
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

    const locale =
      dto.locale ??
      (defaultLocaleForCountry(dto.country as 'AR' | 'US') === 'en' ? Locale.EN : Locale.ES);
    const currency =
      dto.currency ??
      (defaultCurrencyForCountry(dto.country as 'AR' | 'US') === 'USD' ? Currency.USD : Currency.ARS);

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        role: dto.role,
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
