import assert from 'node:assert/strict';
import {
  archiveCutoff,
  confirmationCutoff,
  effectiveRequestStatus,
  inactiveAfterConfirmCutoff,
  isVisibleToSellers,
  savedListPriority,
  sellerListPriority,
  sortSavedRequestsForSeller,
} from './request-status';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

function daysAgo(days: number, hours = 0) {
  return new Date(Date.now() - days * DAY_MS - hours * HOUR_MS);
}

function base(overrides: Partial<Parameters<typeof effectiveRequestStatus>[0]> = {}) {
  return {
    status: 'ACTIVA' as const,
    lastBuyerActivityAt: new Date(),
    pausedAt: null,
    ...overrides,
  };
}

assert.equal(effectiveRequestStatus(base()), 'ACTIVA');
assert.equal(effectiveRequestStatus(base({ status: 'NEGOCIANDO' })), 'NEGOCIANDO');
assert.equal(effectiveRequestStatus(base({ status: 'CERRADA' })), 'CERRADA');

assert.equal(
  effectiveRequestStatus(base({ lastBuyerActivityAt: daysAgo(6) })),
  'ACTIVA',
);

assert.equal(
  effectiveRequestStatus(base({ lastBuyerActivityAt: daysAgo(7, 6) })),
  'PENDIENTE_DE_CONFIRMACION',
);

assert.equal(
  effectiveRequestStatus(base({ lastBuyerActivityAt: daysAgo(7, 25) })),
  'INACTIVA',
);

assert.equal(
  effectiveRequestStatus(base({ lastBuyerActivityAt: daysAgo(10) })),
  'ARCHIVADA',
);

assert.equal(isVisibleToSellers(base({ lastBuyerActivityAt: daysAgo(7, 6) })), false);
assert.equal(isVisibleToSellers(base({ lastBuyerActivityAt: daysAgo(7, 25) })), true);
assert.equal(isVisibleToSellers(base({ lastBuyerActivityAt: daysAgo(10) })), false);

assert.equal(sellerListPriority('ACTIVA'), 0);
assert.equal(sellerListPriority('NEGOCIANDO'), 0);
assert.equal(sellerListPriority('INACTIVA'), 1);
assert.equal(sellerListPriority('PENDIENTE_DE_CONFIRMACION'), 2);

assert.equal(savedListPriority('ACTIVA'), 0);
assert.equal(savedListPriority('NEGOCIANDO'), 1);
assert.equal(savedListPriority('INACTIVA'), 2);
assert.equal(savedListPriority('PENDIENTE_DE_CONFIRMACION'), 2);
assert.equal(savedListPriority('ARCHIVADA'), 3);
assert.equal(savedListPriority('CERRADA'), 3);

const sortedSaved = sortSavedRequestsForSeller([
  base({ status: 'CERRADA' }),
  base({ status: 'NEGOCIANDO' }),
  base({ lastBuyerActivityAt: daysAgo(7, 25) }),
  base({ status: 'ACTIVA' }),
]);
assert.equal(effectiveRequestStatus(sortedSaved[0]), 'ACTIVA');
assert.equal(effectiveRequestStatus(sortedSaved[1]), 'NEGOCIANDO');
assert.equal(effectiveRequestStatus(sortedSaved[2]), 'INACTIVA');
assert.equal(effectiveRequestStatus(sortedSaved[3]), 'CERRADA');

assert.ok(confirmationCutoff().getTime() < Date.now());
assert.ok(inactiveAfterConfirmCutoff().getTime() < confirmationCutoff().getTime());
assert.ok(archiveCutoff().getTime() < inactiveAfterConfirmCutoff().getTime());

console.log('request-status: all assertions passed');
