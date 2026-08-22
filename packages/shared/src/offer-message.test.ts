import assert from 'node:assert/strict';
import { OFFER_MESSAGE_MAX_LENGTH } from './limits';
import { clampOfferMessage, isValidOfferMessage, normalizeOfferMessage } from './offer-message';

assert.equal(OFFER_MESSAGE_MAX_LENGTH, 180);

assert.equal(isValidOfferMessage('Disponible en negro.'), true);
assert.equal(isValidOfferMessage('Ok'), true);

const exact = 'a'.repeat(OFFER_MESSAGE_MAX_LENGTH);
assert.equal(exact.length, 180);
assert.equal(isValidOfferMessage(exact), true);
assert.equal(clampOfferMessage(exact), exact);

const over = 'a'.repeat(OFFER_MESSAGE_MAX_LENGTH + 1);
assert.equal(over.length, 181);
assert.equal(isValidOfferMessage(over), false);
assert.equal(clampOfferMessage(over).length, OFFER_MESSAGE_MAX_LENGTH);

assert.equal(isValidOfferMessage('   '), false);
assert.equal(isValidOfferMessage(''), false);
assert.equal(normalizeOfferMessage('  hello world  '), 'hello world');

const sample =
  'Lo tenemos en un color especial limitado a un precio todavía más accesible que el que deseas, con 6,100 millas. Sin marcas, como nuevo.';
assert.ok(sample.length <= OFFER_MESSAGE_MAX_LENGTH);
assert.equal(isValidOfferMessage(sample), true);

console.log('offer-message: all assertions passed');
