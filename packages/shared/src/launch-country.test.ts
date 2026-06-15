import assert from 'node:assert/strict';
import { parseLaunchCountry } from './launch-country';

assert.equal(parseLaunchCountry(undefined), 'US');
assert.equal(parseLaunchCountry(''), 'US');
assert.equal(parseLaunchCountry('US'), 'US');
assert.equal(parseLaunchCountry('AR'), 'AR');
assert.equal(parseLaunchCountry('MULTI'), null);
assert.equal(parseLaunchCountry('multi'), null);
assert.equal(parseLaunchCountry('invalid'), 'US');

console.log('launch-country: all assertions passed');
