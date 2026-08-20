import assert from 'node:assert/strict';
import { pickOfferHighlights, sellerPersonalName } from './offer-highlights';
import { formatSellerBuyerIdentity } from './seller-profile';

assert.equal(
  sellerPersonalName({
    name: 'Franco Enrici',
    businessName: 'BMW Miami',
    sellerType: 'COMPANY',
  }),
  'Franco Enrici',
);

const highlights = pickOfferHighlights([
  {
    id: 'offer-1',
    price: 90000,
    currency: 'USD',
    message: 'Propuesta completa con fotos reales del vehículo en excelente estado y detalle.',
    imageUrls: ['a.jpg', 'b.jpg'],
    requestTitle: 'Request',
    requestBudget: 100000,
    requestRequirements: 'Clean title',
    requestLocation: 'Miami, FL',
    seller: {
      name: 'Franco Enrici',
      businessName: 'BMW Miami',
      sellerType: 'COMPANY',
      state: 'FL',
      city: 'Miami',
      country: 'US',
      avatarUrl: 'https://cdn.example/seller.jpg',
      rating: { avgStars: 5, reviewCount: 2 },
    },
  },
]);

assert.equal(highlights[0].sellerName, 'Franco Enrici');
assert.equal(highlights[0].businessName, 'BMW Miami');
assert.equal(highlights[0].sellerType, 'COMPANY');
assert.equal(highlights[0].sellerAvatarUrl, 'https://cdn.example/seller.jpg');

const fromHighlight = formatSellerBuyerIdentity(
  {
    role: 'SELLER',
    name: highlights[0].sellerName,
    sellerType: highlights[0].sellerType,
    businessName: highlights[0].businessName,
    state: highlights[0].sellerState,
    city: highlights[0].sellerCity,
    country: highlights[0].sellerCountry,
  },
  'ES',
);
assert.equal(fromHighlight.titleLine, 'Franco Enrici / BMW Miami');
assert.equal(fromHighlight.detailLine, 'Miami, FL');

console.log('offer-highlights-identity: all assertions passed');
