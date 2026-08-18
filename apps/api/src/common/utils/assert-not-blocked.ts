import { ForbiddenException, HttpException, HttpStatus } from '@nestjs/common';

type BlockableUser = {
  blocked: boolean;
  blockedReason?: string | null;
  suspended?: boolean;
};

export const ACCOUNT_BLOCKED_MESSAGE =
  'Tu cuenta está bloqueada. No podés publicar solicitudes, enviar ofertas, chatear ni editar tu perfil. Contactá al soporte si creés que es un error.';

export const ACCOUNT_SUSPENDED_MESSAGE =
  'Tu cuenta está temporalmente suspendida mientras revisamos varios reportes recibidos.';

export const ACCOUNT_BLOCKED_CODE = 'ACCOUNT_BLOCKED';
export const ACCOUNT_SUSPENDED_CODE = 'ACCOUNT_SUSPENDED';

export class AccountDisabledException extends HttpException {
  constructor(code: typeof ACCOUNT_BLOCKED_CODE | typeof ACCOUNT_SUSPENDED_CODE, message: string) {
    super({ statusCode: HttpStatus.FORBIDDEN, error: 'Forbidden', code, message }, HttpStatus.FORBIDDEN);
  }
}

export function assertNotBlocked(user: BlockableUser) {
  if (user.blocked) {
    throw new AccountDisabledException(ACCOUNT_BLOCKED_CODE, ACCOUNT_BLOCKED_MESSAGE);
  }
}

/** Bloquea acciones de marketplace para cuentas bloqueadas o suspendidas. */
export function assertAccountActive(user: BlockableUser) {
  if (user.blocked) {
    throw new AccountDisabledException(ACCOUNT_BLOCKED_CODE, ACCOUNT_BLOCKED_MESSAGE);
  }
  if (user.suspended) {
    throw new AccountDisabledException(ACCOUNT_SUSPENDED_CODE, ACCOUNT_SUSPENDED_MESSAGE);
  }
}

export { ForbiddenException };
