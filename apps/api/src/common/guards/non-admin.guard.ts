import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ADMIN_NO_MARKETPLACE_MESSAGE } from '../utils/assert-not-admin';

/** Rechaza a las cuentas ADMIN en endpoints normales de comprador/vendedor. */
@Injectable()
export class NonAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest<{ user?: { role?: UserRole } }>();
    if (user?.role === UserRole.ADMIN) {
      throw new ForbiddenException(ADMIN_NO_MARKETPLACE_MESSAGE);
    }
    return true;
  }
}
