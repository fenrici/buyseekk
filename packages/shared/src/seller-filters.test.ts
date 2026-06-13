import assert from 'node:assert/strict';
import {
  clearAllSellerFilters,
  clearSellerFilter,
  countActiveSellerFilters,
  EMPTY_SELLER_FILTERS,
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

console.log('seller-filters: all assertions passed');
