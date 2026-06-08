import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY, AppRole } from '../decorators/roles.decorator';
import { AuthUser, isBuyerCapable, isSellerCapable } from '../types/auth-user';

function hasRole(user: AuthUser, role: AppRole) {
  if (role === 'buyer') return isBuyerCapable(user.role);
  return isSellerCapable(user.role);
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<AppRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;

    const { user } = context.switchToHttp().getRequest<{ user: AuthUser }>();
    if (!user) throw new ForbiddenException();

    const allowed = required.some((role) => hasRole(user, role));
    if (!allowed) {
      throw new ForbiddenException('No tenés permisos para esta acción');
    }
    return true;
  }
}
