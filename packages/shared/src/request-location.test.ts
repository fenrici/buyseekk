import assert from 'node:assert/strict';
import {
  formatRequestLocationDisplay,
  isValidUsRequestArea,
  launchCityLocationsForUsState,
  launchMarketsForUsState,
  launchStatesForUsRequests,
  neighborhoodsForUsArea,
  requestMatchesUsLocationFilter,
  sanitizeUsLocationSelection,
  US_REQUEST_LAUNCH_MARKETS_BY_STATE,
} from './index';

assert.deepEqual(launchStatesForUsRequests(), ['FL']);
assert.equal(launchCityLocationsForUsState('TX').length, 0);

const flMarkets = launchMarketsForUsState('FL');
assert.deepEqual(flMarkets, [...US_REQUEST_LAUNCH_MARKETS_BY_STATE.FL]);
for (const market of [
  'Miami',
  'Fort Lauderdale',
  'West Palm Beach',
  'Orlando',
  'Tampa',
  'St. Petersburg',
  'Naples',
  'Fort Myers',
  'Sarasota',
  'Jacksonville',
]) {
  assert.ok(flMarkets.includes(market), `missing market ${market}`);
  assert.ok(launchCityLocationsForUsState('FL').includes(`${market}, FL`));
}

const miamiAreas = neighborhoodsForUsArea('FL', 'Miami');
assert.ok(miamiAreas.includes('Brickell'));
assert.ok(miamiAreas.includes('Design District'));
assert.ok(miamiAreas.includes('North Miami'));
assert.ok(miamiAreas.includes('Sunny Isles'));

assert.ok(neighborhoodsForUsArea('FL', 'Orlando').includes('Downtown Orlando'));
assert.ok(neighborhoodsForUsArea('FL', 'Naples').includes('Old Naples'));
assert.ok(neighborhoodsForUsArea('FL', 'Fort Lauderdale').includes('Las Olas'));
assert.ok(neighborhoodsForUsArea('FL', 'West Palm Beach').includes('Boca Raton'));
assert.equal(neighborhoodsForUsArea('FL', 'Orlando').includes('Brickell'), false);
assert.equal(neighborhoodsForUsArea('FL', 'Miami').includes('Las Olas'), false);

assert.equal(isValidUsRequestArea('FL', 'Miami', 'Brickell'), true);
assert.equal(isValidUsRequestArea('FL', 'Miami', ''), true);
assert.equal(isValidUsRequestArea('FL', 'Naples', 'Old Naples'), true);
assert.equal(isValidUsRequestArea('FL', 'Naples', 'Brickell'), false);

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
assert.equal(cityChange.location, 'Orlando, FL');
assert.equal(cityChange.zone, '');

const naplesPick = sanitizeUsLocationSelection({
  state: 'FL',
  location: 'Naples, FL',
  zone: 'Old Naples',
});
assert.equal(naplesPick.location, 'Naples, FL');
assert.equal(naplesPick.zone, 'Old Naples');

const texasRejected = sanitizeUsLocationSelection({
  state: 'FL',
  location: 'Dallas, TX',
  zone: '',
});
assert.equal(texasRejected.location, 'Miami, FL');
assert.equal(texasRejected.zone, '');

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

const naples = { location: 'Naples, FL', zone: 'Old Naples', state: 'FL' };
assert.equal(
  requestMatchesUsLocationFilter(naples, { state: 'FL', location: 'Miami, FL', zone: '' }),
  false,
);
assert.equal(
  requestMatchesUsLocationFilter(naples, { state: 'FL', location: 'Naples, FL', zone: '' }),
  true,
);

// Brickell request must not match Naples filter
assert.equal(
  requestMatchesUsLocationFilter(floridaRequest, { state: 'FL', location: 'Naples, FL', zone: '' }),
  false,
);

// Zone-only filter must NOT soft-match any-area outside a city
assert.equal(
  requestMatchesUsLocationFilter(orlando, { state: 'FL', location: '', zone: 'Brickell' }),
  false,
);
assert.equal(
  requestMatchesUsLocationFilter(floridaRequest, { state: 'FL', location: '', zone: 'Brickell' }),
  true,
);

const texas = { location: 'Dallas, TX', zone: null, state: 'TX' };
assert.equal(requestMatchesUsLocationFilter(texas, { state: 'FL', location: '', zone: '' }), false);

assert.equal(
  formatRequestLocationDisplay({ location: 'Miami, FL', zone: 'Brickell', country: 'US' }, 'ES'),
  'Miami, FL · Brickell',
);
assert.equal(
  formatRequestLocationDisplay({ location: 'Naples, FL', zone: null, country: 'US' }, 'ES'),
  'Naples, FL · Cualquier zona',
);
assert.equal(
  formatRequestLocationDisplay({ location: 'Orlando, FL', zone: 'Downtown Orlando', country: 'US' }, 'ES'),
  'Orlando, FL · Downtown Orlando',
);
assert.equal(
  formatRequestLocationDisplay({ location: 'Miami, FL', zone: null, country: 'US' }, 'EN'),
  'Miami, FL · Any area',
);

console.log('request-location: all assertions passed');
