import assert from 'node:assert/strict';
import {
  CAR_COLOR_NO_PREFERENCE,
  CAR_CONDITION_NEW,
  formatCarConditionLabel,
  isValidAutoMileagePreference,
} from './car-catalog';
import {
  autoRequestTitle,
  formatAutoSpecLine,
  formatBudgetCapLabel,
  formatCarColorLabel,
  formatMaxMileageLabel,
} from './request-display';
import { requestMatchesSellerFilters, EMPTY_SELLER_FILTERS } from './seller-filters';

assert.equal(autoRequestTitle({ carBrand: 'Porsche', carModel: '911 Carrera' }), 'Porsche 911 Carrera');

assert.equal(formatMaxMileageLabel(null, 'ES'), 'Sin preferencia');
assert.equal(formatMaxMileageLabel(5000, 'ES'), 'Hasta 5.000 mi');
assert.equal(formatMaxMileageLabel(30000, 'ES'), 'Hasta 30.000 mi');

assert.equal(formatCarColorLabel(CAR_COLOR_NO_PREFERENCE, 'ES'), 'Sin preferencia');
assert.equal(formatCarColorLabel('Negro', 'ES'), 'Negro');
assert.equal(formatCarConditionLabel('ES'), 'Nuevo');

assert.equal(isValidAutoMileagePreference(CAR_CONDITION_NEW, null), true);
assert.equal(isValidAutoMileagePreference(CAR_CONDITION_NEW, 5000), false);
assert.equal(isValidAutoMileagePreference(null, 5000), true);
assert.equal(isValidAutoMileagePreference(null, null), true);

assert.equal(
  formatAutoSpecLine({ carYearMin: 2022, maxMileage: 30000 }, 'ES'),
  '2022 o posterior · Hasta 30.000 mi',
);

const currentYear = new Date().getFullYear();
assert.equal(
  formatAutoSpecLine({ carYearMin: currentYear, carCondition: CAR_CONDITION_NEW }, 'ES'),
  `${currentYear} · Nuevo`,
);

assert.match(formatBudgetCapLabel(120000, 'USD', 'ES'), /^Hasta US\$\s?120\.000$/);

const anyColorRequest = {
  category: 'AUTOS',
  country: 'US',
  operation: 'COMPRA',
  location: 'Miami, FL',
  zone: null,
  bedrooms: null,
  minSqm: null,
  maxSqm: null,
  carBrand: 'BMW',
  carModel: 'X5',
  carColor: CAR_COLOR_NO_PREFERENCE,
  carYearMin: 2020,
  carCondition: null,
  maxMileage: null,
};

assert.equal(
  requestMatchesSellerFilters(anyColorRequest, { ...EMPTY_SELLER_FILTERS, carColor: 'Negro' }, {
    sellerCountry: 'US',
    savedCategory: 'AUTOS',
  }),
  true,
);

assert.equal(
  requestMatchesSellerFilters(
    anyColorRequest,
    { ...EMPTY_SELLER_FILTERS, category: 'AUTOS', location: 'Miami, FL' },
    { sellerCountry: 'US', savedCategory: 'AUTOS' },
  ),
  true,
);

const newCarRequest = {
  ...anyColorRequest,
  carCondition: CAR_CONDITION_NEW,
};

assert.equal(
  requestMatchesSellerFilters(
    newCarRequest,
    { ...EMPTY_SELLER_FILTERS, category: 'AUTOS', maxMileage: '10000' },
    { sellerCountry: 'US', savedCategory: 'AUTOS' },
  ),
  true,
);

assert.equal(
  requestMatchesSellerFilters(
    { ...anyColorRequest, maxMileage: 50000 },
    { ...EMPTY_SELLER_FILTERS, category: 'AUTOS', maxMileage: '10000' },
    { sellerCountry: 'US', savedCategory: 'AUTOS' },
  ),
  false,
);

assert.equal(
  requestMatchesSellerFilters(
    newCarRequest,
    { ...EMPTY_SELLER_FILTERS, category: 'AUTOS', carCondition: CAR_CONDITION_NEW },
    { sellerCountry: 'US', savedCategory: 'AUTOS' },
  ),
  true,
);

assert.equal(
  requestMatchesSellerFilters(
    anyColorRequest,
    { ...EMPTY_SELLER_FILTERS, category: 'AUTOS', carCondition: CAR_CONDITION_NEW },
    { sellerCountry: 'US', savedCategory: 'AUTOS' },
  ),
  false,
);

console.log('request-display: all assertions passed');
