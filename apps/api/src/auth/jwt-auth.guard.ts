import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AccountDisabledException } from '../common/utils/assert-not-blocked';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser>(err: unknown, user: TUser, _info: unknown): TUser {
    if (err instanceof AccountDisabledException) throw err;
    if (user) return user;
    if (err instanceof Error) throw err;
    throw new UnauthorizedException();
  }
}
