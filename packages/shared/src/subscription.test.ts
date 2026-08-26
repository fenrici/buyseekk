import assert from 'node:assert/strict';
import {
  PUBLIC_SUBSCRIPTION_PLANS,
  SUBSCRIPTION_PRICES_USD,
  anySubscriptionGrantsPlus,
  canUseEnterpriseFeatures,
  canUsePlusFeatures,
  planCacheLooksLikePlus,
  planFromPlusEntitlement,
  resolvePlusEntitlement,
  subscriptionGrantsPlus,
} from './subscription';

const now = new Date('2026-08-26T15:00:00.000Z');
const future = new Date('2026-09-26T15:00:00.000Z');
const past = new Date('2026-07-26T15:00:00.000Z');

assert.deepEqual([...PUBLIC_SUBSCRIPTION_PLANS], ['FREE', 'PLUS']);
assert.equal(SUBSCRIPTION_PRICES_USD.FREE, 0);
assert.equal(SUBSCRIPTION_PRICES_USD.PLUS, 20);
assert.equal('ENTERPRISE' in SUBSCRIPTION_PRICES_USD, false);

assert.equal(subscriptionGrantsPlus({ status: 'ACTIVE' }, now), true);
assert.equal(subscriptionGrantsPlus({ status: 'TRIALING' }, now), true);
assert.equal(subscriptionGrantsPlus({ status: 'PAST_DUE' }, now), true);
assert.equal(
  subscriptionGrantsPlus({ status: 'CANCELED', currentPeriodEnd: future }, now),
  true,
);
assert.equal(
  subscriptionGrantsPlus({ status: 'CANCELED', currentPeriodEnd: past }, now),
  false,
);
assert.equal(subscriptionGrantsPlus({ status: 'CANCELED', currentPeriodEnd: null }, now), false);
assert.equal(subscriptionGrantsPlus({ status: 'UNPAID' }, now), false);
assert.equal(subscriptionGrantsPlus({ status: 'INCOMPLETE' }, now), false);
assert.equal(subscriptionGrantsPlus({ status: 'EXPIRED' }, now), false);

assert.equal(
  anySubscriptionGrantsPlus(
    [
      { status: 'EXPIRED' },
      { status: 'CANCELED', currentPeriodEnd: future },
    ],
    now,
  ),
  true,
);

assert.equal(planFromPlusEntitlement(true), 'PLUS');
assert.equal(planFromPlusEntitlement(false), 'FREE');
assert.equal(planCacheLooksLikePlus('PLUS'), true);
assert.equal(planCacheLooksLikePlus('ENTERPRISE'), true);
assert.equal(planCacheLooksLikePlus('FREE'), false);

assert.equal(
  resolvePlusEntitlement({
    plusFeaturesUnlocked: true,
    subscriptions: [],
    now,
  }),
  true,
);

assert.equal(
  resolvePlusEntitlement({
    plusFeaturesUnlocked: false,
    subscriptions: [{ status: 'ACTIVE' }],
    now,
  }),
  true,
);

assert.equal(
  resolvePlusEntitlement({
    plusFeaturesUnlocked: false,
    subscriptions: [{ status: 'TRIALING' }],
    now,
  }),
  true,
);

assert.equal(
  resolvePlusEntitlement({
    plusFeaturesUnlocked: false,
    subscriptions: [{ status: 'PAST_DUE' }],
    now,
  }),
  true,
);

// Stale plan cache must NOT grant Plus — resolvePlusEntitlement ignores User.subscriptionPlan.
assert.equal(
  resolvePlusEntitlement({
    plusFeaturesUnlocked: false,
    subscriptions: [],
    now,
  }),
  false,
);

assert.equal(
  resolvePlusEntitlement({
    plusFeaturesUnlocked: false,
    subscriptions: [{ status: 'EXPIRED' }],
    now,
  }),
  false,
);

assert.equal(
  resolvePlusEntitlement({
    plusFeaturesUnlocked: false,
    subscriptions: [{ status: 'UNPAID' }],
    now,
  }),
  false,
);

assert.equal(
  resolvePlusEntitlement({
    plusFeaturesUnlocked: false,
    subscriptions: [{ status: 'CANCELED', currentPeriodEnd: past }],
    now,
  }),
  false,
);

assert.equal(canUsePlusFeatures({ subscriptionPlan: 'PLUS' }, false), false);
assert.equal(canUsePlusFeatures({ subscriptionPlan: 'ENTERPRISE' }, false), false);
assert.equal(canUsePlusFeatures({ subscriptionPlan: 'FREE' }, true), true);
assert.equal(canUseEnterpriseFeatures({ subscriptionPlan: 'ENTERPRISE' }, false), false);
assert.equal(canUseEnterpriseFeatures({ subscriptionPlan: 'FREE' }, true), true);

console.log('subscription-entitlement: all assertions passed');
