import assert from 'node:assert/strict';
import { planPriceLabel, showsPlusMembershipBadge } from './subscription-display';

assert.equal(showsPlusMembershipBadge('PLUS'), true);
assert.equal(showsPlusMembershipBadge('FREE'), false);
assert.equal(showsPlusMembershipBadge('ENTERPRISE'), false);
assert.equal(showsPlusMembershipBadge(undefined), false);

assert.equal(planPriceLabel('PLUS', 'ES'), 'US$19.99/mes');
assert.equal(planPriceLabel('PLUS', 'EN'), 'US$19.99/mo');
assert.equal(planPriceLabel('FREE', 'ES'), 'US$0/mes');

console.log('subscription-display: all assertions passed');
