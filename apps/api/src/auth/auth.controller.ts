import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { THROTTLE_LIMITS } from '../config/throttle.config';
import { AuthService } from './auth.service';
import {
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from './auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import {
  REFRESH_COOKIE_NAME,
  buildRefreshCookieOptions,
  parseCookieValue,
} from './refresh-cookie';
import { SecurityLogService } from './security-log.service';
import { TrustedOriginGuard } from './trusted-origin.guard';

type AuthRequest = {
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
  user?: { id: string };
};

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  private attachRefreshCookie(res: Response, refreshToken: string) {
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, buildRefreshCookieOptions());
  }

  private clearRefreshCookie(res: Response) {
    res.clearCookie(REFRESH_COOKIE_NAME, buildRefreshCookieOptions());
  }

  private refreshFromRequest(req: AuthRequest) {
    return parseCookieValue(req.headers.cookie, REFRESH_COOKIE_NAME);
  }

  @Throttle({ default: THROTTLE_LIMITS.register })
  @Post('register')
  async register(@Body() dto: RegisterDto, @Req() req: AuthRequest, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.register(dto, SecurityLogService.fromRequest(req));
    this.attachRefreshCookie(res, result.refreshToken);
    return { user: result.user, token: result.token };
  }

  @Throttle({ default: THROTTLE_LIMITS.login })
  @Post('login')
  async login(@Body() dto: LoginDto, @Req() req: AuthRequest, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.login(dto, SecurityLogService.fromRequest(req));
    this.attachRefreshCookie(res, result.refreshToken);
    return { user: result.user, token: result.token };
  }

  @Throttle({ default: THROTTLE_LIMITS.refresh })
  @UseGuards(TrustedOriginGuard)
  @Post('refresh')
  async refresh(@Req() req: AuthRequest, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.refresh(this.refreshFromRequest(req), SecurityLogService.fromRequest(req));
    this.attachRefreshCookie(res, result.refreshToken);
    return { user: result.user, token: result.token };
  }

  @Throttle({ default: THROTTLE_LIMITS.refresh })
  @UseGuards(TrustedOriginGuard)
  @Post('logout')
  async logout(@Req() req: AuthRequest, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.logout(this.refreshFromRequest(req), SecurityLogService.fromRequest(req));
    this.clearRefreshCookie(res);
    return result;
  }

  @Throttle({ default: THROTTLE_LIMITS.write })
  @Post('verify-email')
  verifyEmail(@Body() dto: VerifyEmailDto, @Req() req: AuthRequest) {
    return this.auth.verifyEmail(dto, SecurityLogService.fromRequest(req));
  }

  @Throttle({ default: THROTTLE_LIMITS.authEmail })
  @UseGuards(JwtAuthGuard)
  @Post('resend-verification')
  resendVerification(@Req() req: AuthRequest) {
    return this.auth.resendVerification(req.user!.id);
  }

  @Throttle({ default: THROTTLE_LIMITS.authEmail })
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto, @Req() req: AuthRequest) {
    return this.auth.forgotPassword(dto, SecurityLogService.fromRequest(req));
  }

  @Throttle({ default: THROTTLE_LIMITS.authEmail })
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto, @Req() req: AuthRequest) {
    return this.auth.resetPassword(dto, SecurityLogService.fromRequest(req));
  }

  @SkipThrottle()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: AuthRequest) {
    return this.auth.me(req.user!.id);
  }
}
