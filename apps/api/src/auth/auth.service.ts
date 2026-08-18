import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
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
  RegisterDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from './auth.dto';
import { canonicalizeEmail } from './email-canonicalize';
import { parseDurationMs } from './refresh-cookie';
import { EmailService } from './email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SecurityContext, SecurityLogService } from './security-log.service';
import { generateSecureToken, hashToken } from './token.util';
import { assertAccountActive } from '../common/utils/assert-not-blocked';
import {
  assertRegisterCountryAllowed,
  assertLaunchMarketAccess,
  resolveRegisterCountry,
  resolveRegisterCurrency,
} from '../config/launch-country.config';

export type AuthTokens = {
  token: string;
  refreshToken: string;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

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

  private async findUserByEmail(email: string) {
    const canonical = canonicalizeEmail(email);
    const exact = await this.prisma.user.findUnique({ where: { email: canonical } });
    if (exact) return exact;
    return this.prisma.user.findFirst({
      where: { email: { equals: canonical, mode: 'insensitive' } },
    });
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
    const expiresAt = new Date(Date.now() + parseDurationMs(this.getRefreshExpiresIn()));
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
    const webUrl = this.config.get<string>('WEB_URL')?.trim();
    if (webUrl) return webUrl.replace(/\/$/, '');
    const origin = this.config.get<string>('CORS_ORIGIN', 'http://localhost:3000');
    return origin.split(',')[0]?.trim().replace(/\/$/, '') || 'http://localhost:3000';
  }

  /** Envía email de auth. Un fallo de Resend no revierte el token ni aborta el flujo. */
  private async sendAuthEmail(
    payload: { to: string; subject: string; html: string; text: string },
    meta: { type: string; userId: string },
  ) {
    try {
      await this.email.send(payload);
    } catch (err) {
      this.logger.error(
        `Auth email failed type=${meta.type} userId=${meta.userId}`,
        err instanceof Error ? err.stack : err,
      );
    }
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
    await this.sendAuthEmail({ to: user.email, ...content }, {
      type: 'EMAIL_VERIFICATION',
      userId: user.id,
    });
  }

  async register(dto: RegisterDto, ctx: SecurityContext = {}) {
    const email = canonicalizeEmail(dto.email);
    const existing = await this.findUserByEmail(email);
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
        email,
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
    const email = canonicalizeEmail(dto.email);
    const user = await this.findUserByEmail(email);
    if (!user) {
      await this.securityLog.log(SecurityEvent.LOGIN_FAILED, {
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        metadata: { email, reason: 'user_not_found' },
      });
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      await this.securityLog.log(SecurityEvent.LOGIN_FAILED, {
        userId: user.id,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        metadata: { email, reason: 'invalid_password' },
      });
      throw new UnauthorizedException('Credenciales inválidas');
    }

    assertLaunchMarketAccess(user.country, this.config);
    assertAccountActive(user);

    await this.securityLog.log(SecurityEvent.LOGIN_SUCCESS, {
      userId: user.id,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });

    let sessionUser = user;
    const activeMode = canEnterMode(user.activeMode, user) ? user.activeMode : UserMode.BUYER;
    if (user.activeMode !== activeMode) {
      sessionUser = await this.prisma.user.update({
        where: { id: user.id },
        data: { activeMode },
      });
    }

    const tokens = await this.issueTokens(sessionUser);
    return { user: this.toPublicUser(sessionUser), ...tokens };
  }

  async refresh(plainToken: string | undefined, ctx: SecurityContext = {}) {
    if (!plainToken) {
      throw new UnauthorizedException('Sesión expirada. Volvé a iniciar sesión');
    }
    const tokenHash = hashToken(plainToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Sesión expirada. Volvé a iniciar sesión');
    }

    assertLaunchMarketAccess(stored.user.country, this.config);
    assertAccountActive(stored.user);

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const tokens = await this.issueTokens(stored.user);
    return { user: this.toPublicUser(stored.user), ...tokens };
  }

  async logout(plainToken: string | undefined, ctx: SecurityContext = {}) {
    if (!plainToken) return { ok: true };
    const tokenHash = hashToken(plainToken);
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

    try {
      await this.notifications.notifyEmailVerified(user.id, user.locale);
    } catch (err) {
      this.logger.error(
        `EMAIL_VERIFIED notification failed userId=${user.id}`,
        err instanceof Error ? err.stack : err,
      );
    }

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

  private async padForgotTiming(startedAt: number) {
    const minMs = 180;
    const wait = minMs - (Date.now() - startedAt);
    if (wait > 0) {
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
  }

  async forgotPassword(dto: ForgotPasswordDto, ctx: SecurityContext = {}) {
    const startedAt = Date.now();
    const email = canonicalizeEmail(dto.email);
    const user = await this.findUserByEmail(email);
    if (!user) {
      await bcrypt.hash('forgot-password-timing-pad', 10);
      await this.padForgotTiming(startedAt);
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
    await this.sendAuthEmail({ to: user.email, ...content }, {
      type: 'PASSWORD_RESET',
      userId: user.id,
    });

    await this.securityLog.log(SecurityEvent.PASSWORD_RESET_REQUESTED, {
      userId: user.id,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });

    await this.padForgotTiming(startedAt);
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
