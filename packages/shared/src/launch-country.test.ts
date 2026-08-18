import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  defaultRegisterMarket,
  parseLaunchCountry,
  showRegisterMarketSelectors,
} from './launch-country';

assert.equal(parseLaunchCountry(undefined), 'US');
assert.equal(parseLaunchCountry(''), 'US');
assert.equal(parseLaunchCountry('US'), 'US');
assert.equal(parseLaunchCountry('AR'), 'AR');
assert.equal(parseLaunchCountry('MULTI'), null);
assert.equal(parseLaunchCountry('multi'), null);
assert.equal(parseLaunchCountry('invalid'), 'US');

assert.equal(showRegisterMarketSelectors('US'), false);
assert.equal(showRegisterMarketSelectors('AR'), false);
assert.equal(showRegisterMarketSelectors(null), true);

assert.deepEqual(defaultRegisterMarket('US'), { country: 'US', currency: 'USD' });
assert.deepEqual(defaultRegisterMarket('AR'), { country: 'AR', currency: 'ARS' });
assert.deepEqual(defaultRegisterMarket(null), { country: 'US', currency: 'USD' });

const registerPagePath = path.join(
  __dirname,
  '../../../apps/web/src/app/register/page.tsx',
);
const registerPage = fs.readFileSync(registerPagePath, 'utf8');

assert.doesNotMatch(
  registerPage,
  /register-country|register-currency|showCountrySelectors|showCurrencySelectors/,
);
assert.match(registerPage, /getDefaultRegisterCountry\(\)/);
assert.match(registerPage, /getDefaultRegisterCurrency\(\)/);

console.log('launch-country: all assertions passed');
