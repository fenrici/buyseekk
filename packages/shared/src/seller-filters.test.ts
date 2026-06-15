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

const mercedesRequest = { ...bmwMiamiRequest, carBrand: 'Mercedes-Benz', carModel: 'Clase C' };
assert.equal(
  requestMatchesSellerFilters(mercedesRequest, bmwMiamiFilters, { sellerCountry: 'US', savedCategory: 'AUTOS' }),
  false,
);

console.log('seller-filters: all assertions passed');
