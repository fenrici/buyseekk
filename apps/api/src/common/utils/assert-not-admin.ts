import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const ADMIN_NO_MARKETPLACE_MESSAGE =
  'Las cuentas de administrador no pueden operar en el marketplace (publicar, ofertar o chatear).';

export function assertNotAdminForMarketplaceActions(user: { role: UserRole }) {
  if (user.role === UserRole.ADMIN) {
    throw new ForbiddenException(ADMIN_NO_MARKETPLACE_MESSAGE);
  }
}
