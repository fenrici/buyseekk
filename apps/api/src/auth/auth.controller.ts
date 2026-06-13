import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { THROTTLE_LIMITS } from '../config/throttle.config';
import { AuthService } from './auth.service';
import {
  ForgotPasswordDto,
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from './auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { SecurityLogService } from './security-log.service';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Throttle({ default: THROTTLE_LIMITS.register })
  @Post('register')
  register(@Body() dto: RegisterDto, @Req() req: { ip?: string; headers: Record<string, string | string[] | undefined> }) {
    return this.auth.register(dto, SecurityLogService.fromRequest(req));
  }

  @Throttle({ default: THROTTLE_LIMITS.login })
  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: { ip?: string; headers: Record<string, string | string[] | undefined> }) {
    return this.auth.login(dto, SecurityLogService.fromRequest(req));
  }

  @Throttle({ default: THROTTLE_LIMITS.login })
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto, @Req() req: { ip?: string; headers: Record<string, string | string[] | undefined> }) {
    return this.auth.refresh(dto, SecurityLogService.fromRequest(req));
  }

  @SkipThrottle()
  @Post('logout')
  logout(@Body() dto: RefreshTokenDto, @Req() req: { ip?: string; headers: Record<string, string | string[] | undefined> }) {
    return this.auth.logout(dto, SecurityLogService.fromRequest(req));
  }

  @Throttle({ default: THROTTLE_LIMITS.write })
  @Post('verify-email')
  verifyEmail(@Body() dto: VerifyEmailDto, @Req() req: { ip?: string; headers: Record<string, string | string[] | undefined> }) {
    return this.auth.verifyEmail(dto, SecurityLogService.fromRequest(req));
  }

  @SkipThrottle()
  @UseGuards(JwtAuthGuard)
  @Post('resend-verification')
  resendVerification(@Req() req: { user: { id: string } }) {
    return this.auth.resendVerification(req.user.id);
  }

  @Throttle({ default: THROTTLE_LIMITS.write })
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto, @Req() req: { ip?: string; headers: Record<string, string | string[] | undefined> }) {
    return this.auth.forgotPassword(dto, SecurityLogService.fromRequest(req));
  }

  @Throttle({ default: THROTTLE_LIMITS.write })
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto, @Req() req: { ip?: string; headers: Record<string, string | string[] | undefined> }) {
    return this.auth.resetPassword(dto, SecurityLogService.fromRequest(req));
  }

  @SkipThrottle()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: { user: { id: string } }) {
    return this.auth.me(req.user.id);
  }
}
