import assert from 'node:assert/strict';
import {
  checkoutReturnGrantsPlus,
  isStripeCheckoutUrl,
  parseCheckoutReturn,
  requestPlusCheckout,
} from './billing-checkout';

assert.equal(parseCheckoutReturn('success'), 'success');
assert.equal(parseCheckoutReturn('canceled'), 'canceled');
assert.equal(parseCheckoutReturn('plus'), null);
assert.equal(parseCheckoutReturn(null), null);

assert.equal(checkoutReturnGrantsPlus('success'), false);
assert.equal(checkoutReturnGrantsPlus('canceled'), false);
assert.equal(checkoutReturnGrantsPlus(null), false);

assert.equal(isStripeCheckoutUrl('https://checkout.stripe.com/c/pay/cs_test_123'), true);
assert.equal(isStripeCheckoutUrl('https://evil.example/checkout.stripe.com'), false);
assert.equal(isStripeCheckoutUrl('http://checkout.stripe.com/x'), false);

async function runAsync() {
  const url = await requestPlusCheckout(async () => ({
    url: 'https://checkout.stripe.com/c/pay/cs_test_abc',
    sessionId: 'cs_test_abc',
  }) as never);
  assert.equal(url, 'https://checkout.stripe.com/c/pay/cs_test_abc');

  let failed = false;
  try {
    await requestPlusCheckout(async () => ({ url: '' }) as never);
  } catch {
    failed = true;
  }
  assert.equal(failed, true);
}

runAsync()
  .then(() => console.log('billing-checkout: all assertions passed'))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
