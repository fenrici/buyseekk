import assert from 'node:assert/strict';
import {
  OFFER_MESSAGE_MAX_LENGTH,
  clampOfferMessage,
  isValidOfferMessage,
} from '@buyseekk/shared';

assert.equal(OFFER_MESSAGE_MAX_LENGTH, 180);

const typed = 'Propuesta con margen'.padEnd(200, '!');
assert.equal(typed.length, 200);
const clamped = clampOfferMessage(typed);
assert.equal(clamped.length, 180);
assert.equal(clamped, typed.slice(0, 180));

const counter = `${clamped.length} / ${OFFER_MESSAGE_MAX_LENGTH}`;
assert.equal(counter, '180 / 180');

assert.equal(isValidOfferMessage(clamped), true);
assert.equal(isValidOfferMessage(typed), false);
assert.equal(isValidOfferMessage('   '), false);
assert.equal(isValidOfferMessage('Disponible en negro.'), true);
assert.equal(isValidOfferMessage('Ok'), true);

console.log('offer-message-ui: all assertions passed');
