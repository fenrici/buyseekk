import { Body, Controller, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { THROTTLE_LIMITS } from '../config/throttle.config';
import { AuthService } from './auth.service';
import { MobileLoginDto, MobileLogoutDto, MobileRefreshDto, MobileRegisterDto } from './auth-mobile.dto';
import { SecurityLogService } from './security-log.service';

type AuthRequest = {
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
};

/**
 * Native app auth transport: refresh token in JSON (SecureStore on device).
 * Reuses AuthService — no duplicated password/JWT logic.
 */
@Controller('auth/mobile')
export class AuthMobileController {
  constructor(private auth: AuthService) {}

  @Throttle({ default: THROTTLE_LIMITS.register })
  @Post('register')
  async register(@Body() dto: MobileRegisterDto, @Req() req: AuthRequest) {
    const result = await this.auth.register(
      dto,
      SecurityLogService.fromRequest(req),
      {
        clientType: dto.clientType,
        deviceId: dto.deviceId,
        deviceLabel: dto.deviceLabel,
      },
    );
    return {
      user: result.user,
      token: result.token,
      refreshToken: result.refreshToken,
    };
  }

  @Throttle({ default: THROTTLE_LIMITS.login })
  @Post('login')
  async login(@Body() dto: MobileLoginDto, @Req() req: AuthRequest) {
    const result = await this.auth.login(
      dto,
      SecurityLogService.fromRequest(req),
      {
        clientType: dto.clientType,
        deviceId: dto.deviceId,
        deviceLabel: dto.deviceLabel,
      },
    );
    return {
      user: result.user,
      token: result.token,
      refreshToken: result.refreshToken,
    };
  }

  @Throttle({ default: THROTTLE_LIMITS.refresh })
  @Post('refresh')
  async refresh(@Body() dto: MobileRefreshDto, @Req() req: AuthRequest) {
    const result = await this.auth.refresh(
      dto.refreshToken,
      SecurityLogService.fromRequest(req),
      {
        deviceId: dto.deviceId,
        deviceLabel: dto.deviceLabel,
      },
    );
    return {
      user: result.user,
      token: result.token,
      refreshToken: result.refreshToken,
    };
  }

  @Throttle({ default: THROTTLE_LIMITS.refresh })
  @Post('logout')
  async logout(@Body() dto: MobileLogoutDto, @Req() req: AuthRequest) {
    return this.auth.logout(dto.refreshToken, SecurityLogService.fromRequest(req));
  }
}
