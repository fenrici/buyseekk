import { RequestStatus } from '@prisma/client';
import { REQUEST_ARCHIVE_DAYS, REQUEST_INACTIVE_DAYS } from '@buyseekk/shared';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Estado visible de una solicitud. ACTIVA/NEGOCIANDO/CERRADA se almacenan;
 * INACTIVA (7 días sin actividad) y ARCHIVADA (30 días) se derivan de
 * lastActivityAt, así "Seguir buscando" reabre con solo tocar la fecha.
 */
export type EffectiveRequestStatus =
  | 'ACTIVA'
  | 'NEGOCIANDO'
  | 'INACTIVA'
  | 'CERRADA'
  | 'ARCHIVADA';

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

/** Condiciones de visibilidad para vendedores y listados públicos. */
export function visibleToSellersWhere() {
  return {
    status: { not: RequestStatus.CERRADA },
    lastActivityAt: { gte: archiveCutoff() },
  };
}
