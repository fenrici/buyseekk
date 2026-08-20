import assert from 'node:assert/strict';
import {
  formatRequestLocationDisplay,
  launchCityLocationsForUsState,
  launchStatesForUsRequests,
  neighborhoodsForUsArea,
  sanitizeUsLocationSelection,
} from '@buyseekk/shared';

assert.deepEqual(launchStatesForUsRequests(), ['FL']);
assert.deepEqual(launchCityLocationsForUsState('FL'), ['Miami, FL']);
assert.equal(launchCityLocationsForUsState('TX').length, 0);

assert.ok(neighborhoodsForUsArea('FL', 'Miami').includes('Brickell'));
assert.equal(neighborhoodsForUsArea('FL', 'Orlando').includes('Brickell'), false);

const cityChange = sanitizeUsLocationSelection({
  state: 'FL',
  location: 'Orlando, FL',
  zone: 'Brickell',
});
assert.equal(cityChange.location, 'Miami, FL');
assert.equal(cityChange.zone, '');

assert.equal(
  formatRequestLocationDisplay({ location: 'Miami, FL', zone: null, country: 'US' }, 'ES'),
  'Miami, FL · Cualquier zona',
);

console.log('web request-location: all assertions passed');
