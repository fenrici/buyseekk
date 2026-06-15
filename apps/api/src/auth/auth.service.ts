import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Country, Currency, Locale, SecurityEvent, User, UserMode, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { defaultLocaleForCountry, canEnterMode } from '@buyseekk/shared';
import { PrismaService } from '../prisma/prisma.service';
import {
  ForgotPasswordDto,
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from './auth.dto';
import { EmailService } from './email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SecurityContext, SecurityLogService } from './security-log.service';
import { generateSecureToken, hashToken } from './token.util';
import {
  assertRegisterCountryAllowed,
  resolveRegisterCountry,
  resolveRegisterCurrency,
} from '../config/launch-country.config';

export type AuthTokens = {
  token: string;
  refreshToken: string;
};

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private email: EmailService,
    private securityLog: SecurityLogService,
    private notifications: NotificationsService,
  ) {}

  private toPublicUser(user: User) {
    const { passwordHash: _, ...safe } = user;
    return safe;
  }

  private getAccessExpiresIn(): JwtSignOptions['expiresIn'] {
    return (
      this.config.get<string>('JWT_ACCESS_EXPIRES') ??
      this.config.get<string>('JWT_EXPIRES_IN', '15m')
    ) as JwtSignOptions['expiresIn'];
  }

  private getRefreshExpiresIn() {
    return this.config.get<string>('JWT_REFRESH_EXPIRES', '30d');
  }

  private parseDurationMs(value: string): number {
    const match = /^(\d+)([smhd])$/.exec(value.trim());
    if (!match) return 30 * 24 * 60 * 60 * 1000;
    const amount = Number(match[1]);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };
    return amount * (multipliers[unit] ?? multipliers.d);
  }

  private signAccessToken(user: User) {
    return this.jwt.sign(
      { sub: user.id, email: user.email },
      { expiresIn: this.getAccessExpiresIn() },
    );
  }

  private async issueRefreshToken(userId: string): Promise<string> {
    const plain = generateSecureToken();
    const tokenHash = hashToken(plain);
    const expiresAt = new Date(Date.now() + this.parseDurationMs(this.getRefreshExpiresIn()));
    await this.prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    });
    return plain;
  }

  private async issueTokens(user: User): Promise<AuthTokens> {
    const token = this.signAccessToken(user);
    const refreshToken = await this.issueRefreshToken(user.id);
    return { token, refreshToken };
  }

  private getAppBaseUrl() {
    const origin = this.config.get<string>('CORS_ORIGIN', 'http://localhost:3000');
    return origin.split(',')[0]?.trim().replace(/\/$/, '') || 'http://localhost:3000';
  }

  private async sendVerificationEmail(user: User) {
    await this.prisma.emailVerificationToken.deleteMany({ where: { userId: user.id } });
    const plain = generateSecureToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.prisma.emailVerificationToken.create({
      data: { userId: user.id, tokenHash: hashToken(plain), expiresAt },
    });
    const verifyUrl = `${this.getAppBaseUrl()}/verify-email?token=${plain}`;
    const content = this.email.buildVerificationEmail(verifyUrl, user.locale);
    await this.email.send({ to: user.email, ...content });
  }

  async register(dto: RegisterDto, ctx: SecurityContext = {}) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email ya registrado');

    const isSeller = dto.role === UserRole.SELLER || dto.role === UserRole.BOTH;
    if (!isSeller && (dto.sellerType || dto.sellerCategory)) {
      throw new BadRequestException('Solo los vendedores pueden indicar tipo y rubro');
    }

    const hasSellerProfile = isSeller && !!dto.sellerType && !!dto.sellerCategory;

    assertRegisterCountryAllowed(dto.country, this.config);
    const country = resolveRegisterCountry(dto.country, this.config);
    const currency = resolveRegisterCurrency(dto.country, dto.currency, this.config);

    const locale =
      dto.locale ??
      (defaultLocaleForCountry(country) === 'en' ? Locale.EN : Locale.ES);

    const role = hasSellerProfile ? UserRole.BOTH : UserRole.BUYER;
    const activeMode = hasSellerProfile ? UserMode.SELLER : UserMode.BUYER;
    const preferredMode = isSeller ? UserMode.SELLER : UserMode.BUYER;

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        role,
        activeMode,
        preferredMode,
        sellerType: hasSellerProfile ? dto.sellerType : null,
        sellerCategory: hasSellerProfile ? dto.sellerCategory : null,
        country,
        locale,
        currency,
        emailVerified: false,
      },
    });

    await this.sendVerificationEmail(user);
    await this.securityLog.log(SecurityEvent.USER_REGISTERED, {
      userId: user.id,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      metadata: { email: user.email },
    });

    const tokens = await this.issueTokens(user);
    return { user: this.toPublicUser(user), ...tokens };
  }

  async login(dto: LoginDto, ctx: SecurityContext = {}) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      await this.securityLog.log(SecurityEvent.LOGIN_FAILED, {
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        metadata: { email: dto.email, reason: 'user_not_found' },
      });
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      await this.securityLog.log(SecurityEvent.LOGIN_FAILED, {
        userId: user.id,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        metadata: { email: dto.email, reason: 'invalid_password' },
      });
      throw new UnauthorizedException('Credenciales inválidas');
    }

    await this.securityLog.log(SecurityEvent.LOGIN_SUCCESS, {
      userId: user.id,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });

    let sessionUser = user;
    const preferredMode = user.preferredMode ?? user.activeMode;
    if (canEnterMode(preferredMode, user) && user.activeMode !== preferredMode) {
      sessionUser = await this.prisma.user.update({
        where: { id: user.id },
        data: { activeMode: preferredMode },
      });
    }

    const tokens = await this.issueTokens(sessionUser);
    return { user: this.toPublicUser(sessionUser), ...tokens };
  }

  async refresh(dto: RefreshTokenDto, ctx: SecurityContext = {}) {
    const tokenHash = hashToken(dto.refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Sesión expirada. Volvé a iniciar sesión');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const tokens = await this.issueTokens(stored.user);
    return { user: this.toPublicUser(stored.user), ...tokens };
  }

  async logout(dto: RefreshTokenDto, ctx: SecurityContext = {}) {
    const tokenHash = hashToken(dto.refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (stored && !stored.revokedAt) {
      await this.prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() },
      });
      await this.securityLog.log(SecurityEvent.LOGOUT, {
        userId: stored.userId,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
    }
    return { ok: true };
  }

  async verifyEmail(dto: VerifyEmailDto, ctx: SecurityContext = {}) {
    const tokenHash = hashToken(dto.token);
    const record = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!record || record.expiresAt < new Date()) {
      throw new BadRequestException('El enlace de verificación es inválido o expiró');
    }

    if (record.user.emailVerified) {
      await this.prisma.emailVerificationToken.delete({ where: { id: record.id } });
      return { user: this.toPublicUser(record.user), alreadyVerified: true };
    }

    const user = await this.prisma.user.update({
      where: { id: record.userId },
      data: { emailVerified: true, emailVerifiedAt: new Date() },
    });
    await this.prisma.emailVerificationToken.deleteMany({ where: { userId: user.id } });

    await this.securityLog.log(SecurityEvent.EMAIL_VERIFIED, {
      userId: user.id,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });

    await this.notifications.notifyEmailVerified(user.id, user.locale);

    return { user: this.toPublicUser(user), alreadyVerified: false };
  }

  async resendVerification(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    if (user.emailVerified) {
      throw new BadRequestException('Tu email ya está verificado');
    }
    await this.sendVerificationEmail(user);
    return { ok: true };
  }

  async forgotPassword(dto: ForgotPasswordDto, ctx: SecurityContext = {}) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      return { ok: true };
    }

    await this.prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
    const plain = generateSecureToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash: hashToken(plain), expiresAt },
    });

    const resetUrl = `${this.getAppBaseUrl()}/reset-password?token=${plain}`;
    const content = this.email.buildPasswordResetEmail(resetUrl, user.locale);
    await this.email.send({ to: user.email, ...content });

    await this.securityLog.log(SecurityEvent.PASSWORD_RESET_REQUESTED, {
      userId: user.id,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });

    return { ok: true };
  }

  async resetPassword(dto: ResetPasswordDto, ctx: SecurityContext = {}) {
    const tokenHash = hashToken(dto.token);
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException('El enlace de recuperación es inválido o expiró');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    await this.securityLog.log(SecurityEvent.PASSWORD_CHANGED, {
      userId: record.userId,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      metadata: { via: 'password_reset' },
    });

    return { ok: true };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return this.toPublicUser(user);
  }
}
