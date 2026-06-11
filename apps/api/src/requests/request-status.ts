import { RequestStatus } from '@prisma/client';
import { REQUEST_ARCHIVE_DAYS, REQUEST_INACTIVE_DAYS } from '@buyseekk/shared';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Estado visible de una solicitud. ACTIVA/NEGOCIANDO/CERRADA se almacenan;
 * INACTIVA (10 días sin actividad, oculta a vendedores) y ARCHIVADA (30 días)
 * se derivan de lastActivityAt; "Seguir buscando" reabre con solo tocar la fecha.
 */
export type EffectiveRequestStatus =
  | 'ACTIVA'
  | 'NEGOCIANDO'
  | 'INACTIVA'
  | 'CERRADA'
  | 'ARCHIVADA';

export function inactiveCutoff(now = Date.now()) {
  return new Date(now - REQUEST_INACTIVE_DAYS * DAY_MS);
}

export function archiveCutoff(now = Date.now()) {
  return new Date(now - REQUEST_ARCHIVE_DAYS * DAY_MS);
}

export function effectiveRequestStatus(req: {
  status: RequestStatus;
  lastActivityAt: Date;
}): EffectiveRequestStatus {
  if (req.status === RequestStatus.CERRADA) return 'CERRADA';
  const idleMs = Date.now() - req.lastActivityAt.getTime();
  if (idleMs >= REQUEST_ARCHIVE_DAYS * DAY_MS) return 'ARCHIVADA';
  if (idleMs >= REQUEST_INACTIVE_DAYS * DAY_MS) return 'INACTIVA';
  return req.status === RequestStatus.NEGOCIANDO ? 'NEGOCIANDO' : 'ACTIVA';
}

/** Condiciones de visibilidad para vendedores y listados públicos (oculta inactivas >10d). */
export function visibleToSellersWhere() {
  return {
    status: { not: RequestStatus.CERRADA },
    lastActivityAt: { gte: inactiveCutoff() },
  };
}
