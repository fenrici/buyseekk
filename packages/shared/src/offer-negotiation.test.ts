import assert from 'node:assert/strict';
import {
  ACTIVE_NEGOTIATION_FILTER,
  isActiveNegotiation,
  isNegotiationEndedWithoutDeal,
  requestHasActiveNegotiation,
} from './offer-negotiation';

assert.equal(
  isActiveNegotiation({ status: 'ACEPTADA', dealCompletedAt: null, negotiationEndedAt: null }),
  true,
);
assert.equal(
  isActiveNegotiation({ status: 'ACEPTADA', dealCompletedAt: new Date(), negotiationEndedAt: null }),
  false,
);
assert.equal(
  isActiveNegotiation({
    status: 'ACEPTADA',
    dealCompletedAt: null,
    negotiationEndedAt: new Date(),
  }),
  false,
);
assert.equal(isActiveNegotiation({ status: 'PENDIENTE' }), false);

assert.equal(
  isNegotiationEndedWithoutDeal({
    status: 'ACEPTADA',
    dealCompletedAt: null,
    negotiationEndedAt: new Date(),
  }),
  true,
);
assert.equal(
  isNegotiationEndedWithoutDeal({ status: 'ACEPTADA', dealCompletedAt: null, negotiationEndedAt: null }),
  false,
);

assert.equal(ACTIVE_NEGOTIATION_FILTER.status, 'ACEPTADA');
assert.equal(ACTIVE_NEGOTIATION_FILTER.dealCompletedAt, null);
assert.equal(ACTIVE_NEGOTIATION_FILTER.negotiationEndedAt, null);

assert.equal(requestHasActiveNegotiation([]), false);
assert.equal(
  requestHasActiveNegotiation([
    { status: 'ACEPTADA', dealCompletedAt: null, negotiationEndedAt: new Date() },
  ]),
  false,
);
assert.equal(
  requestHasActiveNegotiation([
    { status: 'ACEPTADA', dealCompletedAt: null, negotiationEndedAt: null },
  ]),
  true,
);

console.log('offer-negotiation: all assertions passed');
