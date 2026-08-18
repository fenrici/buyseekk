import assert from 'node:assert/strict';
import {
  isGatedNotificationType,
  isNotificationTypeEnabled,
  parseNotificationPreferences,
} from './notification-preferences';

assert.equal(isGatedNotificationType('NEW_OFFER'), true);
assert.equal(isGatedNotificationType('NEW_MESSAGE'), true);
assert.equal(isGatedNotificationType('NEW_MATCHING_REQUEST'), true);
assert.equal(isGatedNotificationType('REQUEST_EXPIRING'), true);
assert.equal(isGatedNotificationType('REQUEST_INACTIVE'), true);

assert.equal(isGatedNotificationType('OFFER_ACCEPTED'), false);
assert.equal(isGatedNotificationType('OFFER_REJECTED'), false);
assert.equal(isGatedNotificationType('DEAL_COMPLETED'), false);
assert.equal(isGatedNotificationType('REQUEST_CLOSED'), false);
assert.equal(isGatedNotificationType('EMAIL_VERIFIED'), false);

const prefsOff = parseNotificationPreferences({
  newOffers: false,
  newMessages: false,
  matchingRequests: false,
  requestExpiring: false,
  requestInactive: false,
});
assert.equal(isNotificationTypeEnabled(prefsOff, 'NEW_OFFER'), false);
assert.equal(isNotificationTypeEnabled(prefsOff, 'NEW_MESSAGE'), false);

console.log('notification-preferences.test.ts ok');
