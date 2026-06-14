import { ForbiddenException } from '@nestjs/common';

type BlockableUser = {
  blocked: boolean;
  blockedReason?: string | null;
  suspended?: boolean;
};

export const ACCOUNT_BLOCKED_MESSAGE =
  'Tu cuenta está bloqueada. No podés publicar solicitudes, enviar ofertas, chatear ni editar tu perfil. Contactá al soporte si creés que es un error.';

export const ACCOUNT_SUSPENDED_MESSAGE =
  'Tu cuenta está temporalmente suspendida mientras revisamos varios reportes recibidos.';

export function assertNotBlocked(user: BlockableUser) {
  if (user.blocked) {
    throw new ForbiddenException(ACCOUNT_BLOCKED_MESSAGE);
  }
}

/** Bloquea acciones de marketplace para cuentas bloqueadas o suspendidas. */
export function assertAccountActive(user: BlockableUser) {
  if (user.blocked) {
    throw new ForbiddenException(ACCOUNT_BLOCKED_MESSAGE);
  }
  if (user.suspended) {
    throw new ForbiddenException(ACCOUNT_SUSPENDED_MESSAGE);
  }
}
