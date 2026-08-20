import assert from 'node:assert/strict';
import {
  businessTypeLabel,
  canSendOffers,
  formatSellerBuyerIdentity,
  formatSellerLocation,
  isCompanySellerProfileComplete,
  isIndividualSellerProfileComplete,
} from './seller-profile';

assert.equal(
  isIndividualSellerProfileComplete({
    role: 'BOTH',
    sellerType: 'INDIVIDUAL',
    sellerCategory: 'AUTOS',
    state: 'FL',
    city: 'Miami, FL',
  }),
  true,
);

assert.equal(
  isIndividualSellerProfileComplete({
    role: 'BOTH',
    sellerType: 'INDIVIDUAL',
    sellerCategory: 'AUTOS',
    state: 'FL',
    city: '',
  }),
  false,
);

assert.equal(
  isCompanySellerProfileComplete({
    role: 'SELLER',
    sellerType: 'COMPANY',
    sellerCategory: 'AUTOS',
    businessName: 'Porsche Miami',
    businessType: null,
    state: 'FL',
    city: 'Miami, FL',
  }),
  true,
  'businessType is not required for company profile completeness',
);

assert.equal(
  isCompanySellerProfileComplete({
    role: 'SELLER',
    sellerType: 'COMPANY',
    sellerCategory: 'AUTOS',
    businessName: '',
    state: 'FL',
    city: 'Miami, FL',
  }),
  false,
);

assert.equal(
  canSendOffers({
    role: 'BUYER',
    sellerType: 'INDIVIDUAL',
    sellerCategory: 'AUTOS',
    state: 'FL',
    city: 'Miami, FL',
  }),
  false,
);

assert.equal(
  canSendOffers({
    role: 'BOTH',
    sellerType: 'INDIVIDUAL',
    sellerCategory: 'AUTOS',
    state: 'FL',
    city: 'Miami, FL',
  }),
  true,
);

assert.equal(
  canSendOffers({
    role: 'SELLER',
    sellerType: 'INDIVIDUAL',
    sellerCategory: 'AUTOS',
    state: 'FL',
    city: '',
  }),
  false,
);

assert.equal(
  canSendOffers({
    role: 'SELLER',
    sellerType: 'COMPANY',
    sellerCategory: 'AUTOS',
    businessName: 'BMW Miami',
    businessType: null,
    state: 'FL',
    city: 'Miami',
  }),
  true,
);

assert.equal(
  canSendOffers({
    role: 'SELLER',
    sellerType: 'COMPANY',
    sellerCategory: 'AUTOS',
    businessName: '',
    state: 'FL',
    city: 'Miami',
  }),
  false,
);

const individualEs = formatSellerBuyerIdentity(
  {
    role: 'SELLER',
    sellerType: 'INDIVIDUAL',
    name: 'Franco Enrici',
    state: 'FL',
    city: 'Miami, FL',
    country: 'US',
  },
  'ES',
);
assert.equal(individualEs.titleLine, 'Franco Enrici / Vendedor particular');
assert.equal(individualEs.detailLine, 'Miami, FL');

const companyEn = formatSellerBuyerIdentity(
  {
    role: 'SELLER',
    sellerType: 'COMPANY',
    name: 'Franco Enrici',
    businessName: 'BMW Miami',
    businessType: 'DEALERSHIP',
    state: 'FL',
    city: 'Miami, FL',
    country: 'US',
  },
  'EN',
);
assert.equal(companyEn.titleLine, 'Franco Enrici / BMW Miami');
assert.equal(companyEn.detailLine, 'Miami, FL');
assert.ok(!companyEn.titleLine.startsWith('BMW Miami'));
assert.ok(!companyEn.detailLine.includes('Dealership'));

assert.equal(
  formatSellerLocation({ city: 'Miami, FL', state: 'FL', country: 'US' }),
  'Miami, FL',
);

const legacySplit = formatSellerBuyerIdentity(
  {
    role: 'SELLER',
    sellerType: 'INDIVIDUAL',
    name: 'Franco Enrici',
    state: 'FL',
    city: 'Miami',
    country: 'US',
  },
  'ES',
);
assert.equal(legacySplit.titleLine, 'Franco Enrici / Vendedor particular');
assert.equal(legacySplit.detailLine, 'Miami, FL');
assert.notEqual(legacySplit.detailLine, 'Miami, FL, FL');

assert.equal(businessTypeLabel('REAL_ESTATE_AGENCY', 'EN'), 'Real Estate Agency');

console.log('seller-profile: all assertions passed');
