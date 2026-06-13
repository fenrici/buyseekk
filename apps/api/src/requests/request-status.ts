import { RequestStatus } from '@prisma/client';
import {
  archiveCutoff,
  confirmationCutoff,
  effectiveRequestStatus,
  inactiveAfterConfirmCutoff,
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
  isVisibleToSellers,
  sortRequestsForSeller,
  type EffectiveRequestStatus,
  type RequestLifecycleInput,
};

type LifecycleRow = {
  status: RequestStatus;
  lastBuyerActivityAt: Date;
  pausedAt: Date | null;
};

export function toLifecycleInput(req: LifecycleRow): RequestLifecycleInput {
  return {
    status: req.status as RequestLifecycleInput['status'],
    lastBuyerActivityAt: req.lastBuyerActivityAt,
    pausedAt: req.pausedAt,
  };
}

/** Condiciones Prisma: oculta Pendiente de confirmación y Archivada; muestra Inactiva. */
export function visibleToSellersWhere(now = Date.now()) {
  const confirmation = confirmationCutoff(now);
  const inactive = inactiveAfterConfirmCutoff(now);
  const archive = archiveCutoff(now);

  return {
    status: { not: RequestStatus.CERRADA },
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
