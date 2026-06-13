import { ForbiddenException } from '@nestjs/common';

type VerifiableUser = { emailVerified: boolean };

export function assertEmailVerified(user: VerifiableUser) {
  if (!user.emailVerified) {
    throw new ForbiddenException(
      'Debés verificar tu email antes de publicar solicitudes, enviar ofertas o usar el chat',
    );
  }
}
