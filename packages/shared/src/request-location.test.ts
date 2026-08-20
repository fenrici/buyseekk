import assert from 'node:assert/strict';
import {
  formatRequestLocationDisplay,
  isValidUsRequestArea,
  launchCityLocationsForUsState,
  launchStatesForUsRequests,
  neighborhoodsForUsArea,
  requestMatchesUsLocationFilter,
  sanitizeUsLocationSelection,
} from './index';

assert.deepEqual(launchStatesForUsRequests(), ['FL']);
assert.deepEqual(launchCityLocationsForUsState('FL'), ['Miami, FL']);
assert.equal(launchCityLocationsForUsState('TX').length, 0);

const miamiAreas = neighborhoodsForUsArea('FL', 'Miami');
assert.ok(miamiAreas.includes('Brickell'));
assert.ok(miamiAreas.includes('Design District'));
assert.ok(miamiAreas.includes('North Miami'));
assert.ok(miamiAreas.includes('Sunny Isles'));
assert.equal(neighborhoodsForUsArea('FL', 'Orlando').includes('Brickell'), false);

assert.equal(isValidUsRequestArea('FL', 'Miami', 'Brickell'), true);
assert.equal(isValidUsRequestArea('FL', 'Miami', ''), true);

const saved = sanitizeUsLocationSelection({
  state: 'FL',
  location: 'Miami, FL',
  zone: 'Brickell',
});
assert.equal(saved.location, 'Miami, FL');
assert.equal(saved.zone, 'Brickell');

const anyZone = sanitizeUsLocationSelection({
  state: 'FL',
  location: 'Miami, FL',
  zone: '',
});
assert.equal(anyZone.zone, '');

const cityChange = sanitizeUsLocationSelection({
  state: 'FL',
  location: 'Orlando, FL',
  zone: 'Brickell',
});
assert.equal(cityChange.location, 'Miami, FL');
assert.equal(cityChange.zone, '');

const floridaRequest = {
  location: 'Miami, FL',
  zone: 'Brickell',
  state: 'FL',
};
assert.equal(
  requestMatchesUsLocationFilter(floridaRequest, { state: 'FL', location: '', zone: '' }),
  true,
);
assert.equal(
  requestMatchesUsLocationFilter(floridaRequest, { state: 'FL', location: 'Miami, FL', zone: '' }),
  true,
);
assert.equal(
  requestMatchesUsLocationFilter(floridaRequest, { state: 'FL', location: 'Miami, FL', zone: 'Brickell' }),
  true,
);

const anyMiami = { location: 'Miami, FL', zone: null, state: 'FL' };
assert.equal(
  requestMatchesUsLocationFilter(anyMiami, { state: 'FL', location: 'Miami, FL', zone: 'Brickell' }),
  true,
);

const orlando = { location: 'Orlando, FL', zone: null, state: 'FL' };
assert.equal(
  requestMatchesUsLocationFilter(orlando, { state: 'FL', location: 'Miami, FL', zone: '' }),
  false,
);

const fortLauderdale = { location: 'Fort Lauderdale, FL', zone: null, state: 'FL' };
assert.equal(
  requestMatchesUsLocationFilter(fortLauderdale, { state: 'FL', location: 'Miami, FL', zone: '' }),
  false,
);

const texas = { location: 'Dallas, TX', zone: null, state: 'TX' };
assert.equal(requestMatchesUsLocationFilter(texas, { state: 'FL', location: '', zone: '' }), false);

assert.equal(
  formatRequestLocationDisplay({ location: 'Miami, FL', zone: 'Brickell', country: 'US' }, 'ES'),
  'Miami, FL · Brickell',
);
assert.equal(
  formatRequestLocationDisplay({ location: 'Miami, FL', zone: null, country: 'US' }, 'ES'),
  'Miami, FL · Cualquier zona',
);
assert.equal(
  formatRequestLocationDisplay({ location: 'Miami, FL', zone: null, country: 'US' }, 'EN'),
  'Miami, FL · Any area',
);

console.log('request-location: all assertions passed');
