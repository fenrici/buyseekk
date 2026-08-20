import assert from 'node:assert/strict';
import { formatSellerBuyerIdentity, pickOfferHighlights, sellerPersonalName } from '@buyseekk/shared';

const companySeller = {
  name: 'Franco Enrici',
  businessName: 'BMW Miami',
  sellerType: 'COMPANY' as const,
  state: 'FL',
  city: 'Miami',
  country: 'US',
  avatarUrl: 'https://cdn.example/seller-logo.jpg',
};

const individualSeller = {
  name: 'Franco Enrici',
  businessName: 'Should Not Replace Name',
  sellerType: 'INDIVIDUAL' as const,
  state: 'FL',
  city: 'Miami',
  country: 'US',
  avatarUrl: 'https://cdn.example/seller-photo.jpg',
};

assert.equal(sellerPersonalName(companySeller), 'Franco Enrici');
assert.notEqual(sellerPersonalName(companySeller), 'BMW Miami');
assert.equal(sellerPersonalName(individualSeller), 'Franco Enrici');

const companyIdentity = formatSellerBuyerIdentity({ role: 'SELLER', ...companySeller }, 'ES');
assert.equal(companyIdentity.titleLine, 'Franco Enrici / BMW Miami');
assert.equal(companyIdentity.detailLine, 'Miami, FL');
assert.ok(!companyIdentity.titleLine.startsWith('BMW Miami'));

const individualIdentity = formatSellerBuyerIdentity({ role: 'SELLER', ...individualSeller }, 'ES');
assert.equal(individualIdentity.titleLine, 'Franco Enrici / Vendedor particular');
assert.equal(individualIdentity.detailLine, 'Miami, FL');
assert.ok(!individualIdentity.titleLine.includes('Should Not Replace Name'));

const highlights = pickOfferHighlights([
  {
    id: 'o1',
    price: 100000,
    currency: 'USD',
    message: 'Propuesta completa con fotos reales del vehículo en excelente estado y detalle.',
    imageUrls: ['https://cdn.example/1.jpg', 'https://cdn.example/2.jpg'],
    requestTitle: 'Ferrari',
    requestBudget: 120000,
    requestRequirements: 'Rojo',
    requestLocation: 'Miami, FL',
    seller: companySeller,
  },
]);

assert.equal(highlights.length, 1);
assert.equal(highlights[0].sellerName, 'Franco Enrici');
assert.notEqual(highlights[0].sellerName, 'BMW Miami');
assert.equal(highlights[0].sellerType, 'COMPANY');
assert.equal(highlights[0].businessName, 'BMW Miami');
assert.equal(highlights[0].sellerCity, 'Miami');
assert.equal(highlights[0].sellerState, 'FL');
assert.equal(highlights[0].sellerAvatarUrl, 'https://cdn.example/seller-logo.jpg');

const bothIdentity = formatSellerBuyerIdentity(
  { role: 'BOTH', sellerType: 'COMPANY', name: 'Franco Enrici', businessName: 'BMW Miami', state: 'FL', city: 'Miami', country: 'US' },
  'EN',
);
assert.equal(bothIdentity.titleLine, 'Franco Enrici / BMW Miami');
assert.equal(bothIdentity.detailLine, 'Miami, FL');

console.log('seller-buyer-identity: all assertions passed');
