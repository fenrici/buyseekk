import assert from 'node:assert/strict';
import {
  clearAllSellerFilters,
  clearSellerFilter,
  countActiveSellerFilters,
  EMPTY_SELLER_FILTERS,
  requestMatchesSellerFilters,
  sellerFiltersEqual,
  sellerFiltersToSearchParams,
} from './seller-filters';

assert.equal(countActiveSellerFilters(EMPTY_SELLER_FILTERS), 0);

const miamiBmw = {
  ...EMPTY_SELLER_FILTERS,
  category: 'AUTOS',
  location: 'Miami',
  carBrand: 'BMW',
  carYearMin: '2020',
};
assert.equal(countActiveSellerFilters(miamiBmw), 4);

const cleared = clearSellerFilter(miamiBmw, 'carBrand');
assert.equal(cleared.carBrand, '');
assert.equal(cleared.carModel, '');

assert.equal(countActiveSellerFilters(clearAllSellerFilters('AUTOS'), 'AUTOS'), 0);

const params = sellerFiltersToSearchParams(miamiBmw);
assert.equal(params.get('location'), 'Miami');
assert.equal(params.get('carBrand'), 'BMW');
assert.equal(params.get('category'), 'AUTOS');
assert.equal(params.get('bedrooms'), null);

assert.equal(sellerFiltersEqual(miamiBmw, { ...miamiBmw }), true);
assert.equal(sellerFiltersEqual(miamiBmw, { ...miamiBmw, zone: 'Brickell' }), false);

const bmwMiamiRequest = {
  category: 'AUTOS',
  country: 'US',
  operation: 'COMPRA',
  location: 'Miami, FL',
  zone: 'Brickell',
  bedrooms: null,
  minSqm: null,
  maxSqm: null,
  carBrand: 'BMW',
  carModel: 'Serie 3',
  carColor: 'Negro',
  carYearMin: 2019,
  carCondition: null,
  maxMileage: 40000,
};

const bmwMiamiFilters = {
  ...EMPTY_SELLER_FILTERS,
  category: 'AUTOS',
  location: 'Miami, FL',
  carBrand: 'BMW',
};

assert.equal(
  requestMatchesSellerFilters(bmwMiamiRequest, bmwMiamiFilters, { sellerCountry: 'US', savedCategory: 'AUTOS' }),
  true,
);

const orlandoRequest = { ...bmwMiamiRequest, location: 'Orlando, FL', zone: null };
assert.equal(
  requestMatchesSellerFilters(orlandoRequest, bmwMiamiFilters, { sellerCountry: 'US', savedCategory: 'AUTOS' }),
  false,
);

assert.equal(
  requestMatchesSellerFilters(
    bmwMiamiRequest,
    { ...EMPTY_SELLER_FILTERS, category: 'AUTOS', state: 'FL' },
    { sellerCountry: 'US', savedCategory: 'AUTOS' },
  ),
  true,
);

const mercedesRequest = { ...bmwMiamiRequest, carBrand: 'Mercedes-Benz', carModel: 'Clase C' };
assert.equal(
  requestMatchesSellerFilters(mercedesRequest, bmwMiamiFilters, { sellerCountry: 'US', savedCategory: 'AUTOS' }),
  false,
);

const miamiAnyRequest = { ...bmwMiamiRequest, zone: null };
assert.equal(
  requestMatchesSellerFilters(miamiAnyRequest, { ...bmwMiamiFilters, zone: 'Brickell' }, {
    sellerCountry: 'US',
    savedCategory: 'AUTOS',
  }),
  true,
);

const naplesRequest = { ...bmwMiamiRequest, location: 'Naples, FL', zone: 'Old Naples' };
assert.equal(
  requestMatchesSellerFilters(naplesRequest, bmwMiamiFilters, { sellerCountry: 'US', savedCategory: 'AUTOS' }),
  false,
);

const fortLauderdaleRequest = { ...bmwMiamiRequest, location: 'Fort Lauderdale, FL', zone: null };
assert.equal(
  requestMatchesSellerFilters(fortLauderdaleRequest, bmwMiamiFilters, {
    sellerCountry: 'US',
    savedCategory: 'AUTOS',
  }),
  false,
);

// Zone without city must not soft-match any-area statewide
assert.equal(
  requestMatchesSellerFilters(
    orlandoRequest,
    { ...EMPTY_SELLER_FILTERS, category: 'AUTOS', state: 'FL', zone: 'Brickell' },
    { sellerCountry: 'US', savedCategory: 'AUTOS' },
  ),
  false,
);

assert.equal(
  requestMatchesSellerFilters(
    naplesRequest,
    { ...EMPTY_SELLER_FILTERS, category: 'AUTOS', state: 'FL', location: 'Naples, FL' },
    { sellerCountry: 'US', savedCategory: 'AUTOS' },
  ),
  true,
);

console.log('seller-filters: all assertions passed');
