import {
  REQUEST_ARCHIVE_DAYS,
  REQUEST_CONFIRMATION_DAYS,
  REQUEST_INACTIVE_AFTER_CONFIRM_HOURS,
} from './limits';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

export type StoredRequestStatus = 'ACTIVA' | 'NEGOCIANDO' | 'CERRADA';

export type EffectiveRequestStatus =
  | 'ACTIVA'
  | 'NEGOCIANDO'
  | 'PENDIENTE_DE_CONFIRMACION'
  | 'INACTIVA'
  | 'CERRADA'
  | 'ARCHIVADA';

export type RequestLifecycleInput = {
  status: StoredRequestStatus;
  lastBuyerActivityAt: Date;
  pausedAt?: Date | null;
};

export function confirmationCutoff(now = Date.now()) {
  return new Date(now - REQUEST_CONFIRMATION_DAYS * DAY_MS);
}

export function inactiveAfterConfirmCutoff(now = Date.now()) {
  return new Date(
    now - REQUEST_CONFIRMATION_DAYS * DAY_MS - REQUEST_INACTIVE_AFTER_CONFIRM_HOURS * HOUR_MS,
  );
}

export function archiveCutoff(now = Date.now()) {
  return new Date(now - REQUEST_ARCHIVE_DAYS * DAY_MS);
}

/** Fecha de actividad que fuerza estado Archivada (p. ej. al pausar manualmente). */
export function archivedBuyerActivityAt(now = Date.now()) {
  return new Date(archiveCutoff(now).getTime() - HOUR_MS);
}

export function idleMsSince(lastBuyerActivityAt: Date, now = Date.now()) {
  return now - lastBuyerActivityAt.getTime();
}

export function effectiveRequestStatus(
  req: RequestLifecycleInput,
  now = Date.now(),
): EffectiveRequestStatus {
  if (req.status === 'CERRADA') return 'CERRADA';

  const idleMs = idleMsSince(req.lastBuyerActivityAt, now);
  if (idleMs >= REQUEST_ARCHIVE_DAYS * DAY_MS) return 'ARCHIVADA';
  if (idleMs >= REQUEST_CONFIRMATION_DAYS * DAY_MS + REQUEST_INACTIVE_AFTER_CONFIRM_HOURS * HOUR_MS) {
    return 'INACTIVA';
  }
  if (idleMs >= REQUEST_CONFIRMATION_DAYS * DAY_MS) return 'PENDIENTE_DE_CONFIRMACION';
  return req.status === 'NEGOCIANDO' ? 'NEGOCIANDO' : 'ACTIVA';
}

export function isVisibleToSellers(req: RequestLifecycleInput, now = Date.now()) {
  const status = effectiveRequestStatus(req, now);
  return status === 'ACTIVA' || status === 'NEGOCIANDO' || status === 'INACTIVA';
}

/** Prioridad en exploración: Activa/Negociando primero, luego Inactiva. */
export function sellerListPriority(status: EffectiveRequestStatus) {
  if (status === 'ACTIVA' || status === 'NEGOCIANDO') return 0;
  if (status === 'INACTIVA') return 1;
  return 2;
}

/** Prioridad en guardadas: Activas → Negociando → Inactivas → Archivadas/Cerradas. */
export function savedListPriority(status: EffectiveRequestStatus) {
  if (status === 'ACTIVA') return 0;
  if (status === 'NEGOCIANDO') return 1;
  if (status === 'INACTIVA' || status === 'PENDIENTE_DE_CONFIRMACION') return 2;
  return 3;
}

export function sortSavedRequestsForSeller<T extends RequestLifecycleInput>(
  items: T[],
  now = Date.now(),
): T[] {
  return [...items].sort((a, b) => {
    const tierA = savedListPriority(effectiveRequestStatus(a, now));
    const tierB = savedListPriority(effectiveRequestStatus(b, now));
    if (tierA !== tierB) return tierA - tierB;
    return b.lastBuyerActivityAt.getTime() - a.lastBuyerActivityAt.getTime();
  });
}

export function sortRequestsForSeller<T extends RequestLifecycleInput>(
  items: T[],
  now = Date.now(),
): T[] {
  return [...items].sort((a, b) => {
    const tierA = sellerListPriority(effectiveRequestStatus(a, now));
    const tierB = sellerListPriority(effectiveRequestStatus(b, now));
    if (tierA !== tierB) return tierA - tierB;
    return b.lastBuyerActivityAt.getTime() - a.lastBuyerActivityAt.getTime();
  });
}
