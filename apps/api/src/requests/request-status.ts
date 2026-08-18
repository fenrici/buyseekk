import { RequestStatus } from '@prisma/client';
import {
  archiveCutoff,
  confirmationCutoff,
  effectiveRequestStatus,
  inactiveAfterConfirmCutoff,
  isOfferable,
  isVisibleToSellers,
  sortRequestsForSeller,
  type EffectiveRequestStatus,
  type RequestLifecycleInput,
} from '@buyseekk/shared';

export {
  archiveCutoff,
  confirmationCutoff,
  effectiveRequestStatus,
  inactiveAfterConfirmCutoff,
  isOfferable,
  isVisibleToSellers,
  sortRequestsForSeller,
  type EffectiveRequestStatus,
  type RequestLifecycleInput,
};

type LifecycleRow = {
  status: RequestStatus;
  lastBuyerActivityAt: Date;
  pausedAt: Date | null;
  active?: boolean;
};

export function toLifecycleInput(req: LifecycleRow): RequestLifecycleInput {
  return {
    status: req.status as RequestLifecycleInput['status'],
    lastBuyerActivityAt: req.lastBuyerActivityAt,
    pausedAt: req.pausedAt,
    active: req.active,
  };
}

/** Condiciones Prisma: oculta Pendiente, Archivada y Pausada; muestra Inactiva. */
export function visibleToSellersWhere(now = Date.now()) {
  const confirmation = confirmationCutoff(now);
  const inactive = inactiveAfterConfirmCutoff(now);
  const archive = archiveCutoff(now);

  return {
    status: { not: RequestStatus.CERRADA },
    pausedAt: null,
    lastBuyerActivityAt: { gte: archive },
    OR: [
      { lastBuyerActivityAt: { gte: confirmation } },
      { lastBuyerActivityAt: { lt: inactive } },
    ],
    NOT: {
      AND: [
        { lastBuyerActivityAt: { lt: confirmation } },
        { lastBuyerActivityAt: { gte: inactive } },
      ],
    },
  };
}

/** Solicitudes que ocupan cupo del comprador (visibles o pausadas explícitamente). */
export function countsTowardBuyerLimitWhere(now = Date.now()) {
  return {
    active: true,
    OR: [
      { pausedAt: { not: null }, status: { not: RequestStatus.CERRADA } },
      visibleToSellersWhere(now),
    ],
  };
}
