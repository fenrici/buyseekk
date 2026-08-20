import assert from 'node:assert/strict';
import {
  formatRequestLocationDisplay,
  launchCityLocationsForUsState,
  launchMarketsForUsState,
  launchStatesForUsRequests,
  neighborhoodsForUsArea,
  sanitizeUsLocationSelection,
} from '@buyseekk/shared';

assert.deepEqual(launchStatesForUsRequests(), ['FL']);
assert.equal(launchCityLocationsForUsState('TX').length, 0);
assert.ok(launchMarketsForUsState('FL').includes('Miami'));
assert.ok(launchMarketsForUsState('FL').includes('Naples'));
assert.ok(launchMarketsForUsState('FL').includes('Orlando'));
assert.ok(launchMarketsForUsState('FL').includes('Fort Lauderdale'));
assert.ok(launchCityLocationsForUsState('FL').includes('Jacksonville, FL'));

assert.ok(neighborhoodsForUsArea('FL', 'Miami').includes('Brickell'));
assert.ok(neighborhoodsForUsArea('FL', 'Orlando').includes('Downtown Orlando'));
assert.equal(neighborhoodsForUsArea('FL', 'Orlando').includes('Brickell'), false);

const cityChange = sanitizeUsLocationSelection({
  state: 'FL',
  location: 'Orlando, FL',
  zone: 'Brickell',
});
assert.equal(cityChange.location, 'Orlando, FL');
assert.equal(cityChange.zone, '');

assert.equal(
  formatRequestLocationDisplay({ location: 'Miami, FL', zone: null, country: 'US' }, 'ES'),
  'Miami, FL · Cualquier zona',
);
assert.equal(
  formatRequestLocationDisplay({ location: 'Naples, FL', zone: null, country: 'US' }, 'ES'),
  'Naples, FL · Cualquier zona',
);

console.log('web request-location: all assertions passed');
