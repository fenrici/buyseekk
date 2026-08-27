import assert from 'node:assert/strict';
import { formatBillingPeriodEnd } from './billing-management';

assert.equal(formatBillingPeriodEnd('2026-09-26T12:00:00.000Z', 'ES')?.includes('26'), true);
assert.equal(formatBillingPeriodEnd(null, 'ES'), null);

console.log('billing-management: all assertions passed');
