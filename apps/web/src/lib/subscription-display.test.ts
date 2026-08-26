import assert from 'node:assert/strict';
import { showsPlusMembershipBadge } from './subscription-display';

assert.equal(showsPlusMembershipBadge('PLUS'), true);
assert.equal(showsPlusMembershipBadge('FREE'), false);
assert.equal(showsPlusMembershipBadge('ENTERPRISE'), false);
assert.equal(showsPlusMembershipBadge(undefined), false);

console.log('subscription-display: all assertions passed');
