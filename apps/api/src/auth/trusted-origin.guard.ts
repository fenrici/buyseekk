import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { parseCorsOrigins } from '../config/cors-origins';

/**
 * Protege refresh/logout (cookie). SameSite + CORS allowlist + POST.
 * En test/dev se permite request sin Origin (supertest).
 */
@Injectable()
export class TrustedOriginGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
    }>();
    const allowed = parseCorsOrigins(process.env.CORS_ORIGIN);
    const originRaw = req.headers.origin;
    const origin = (Array.isArray(originRaw) ? originRaw[0] : originRaw)?.replace(/\/$/, '');

    if (origin) {
      if (!allowed.includes(origin)) {
        throw new ForbiddenException('Origen no permitido');
      }
      return true;
    }

    if (process.env.NODE_ENV !== 'production') return true;

    const refererRaw = req.headers.referer ?? req.headers.referrer;
    const referer = Array.isArray(refererRaw) ? refererRaw[0] : refererRaw;
    if (referer && allowed.some((item) => referer.startsWith(item))) return true;

    throw new ForbiddenException('Origen no permitido');
  }
}
