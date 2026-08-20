import assert from 'node:assert/strict';
import { formatSellerBuyerIdentity } from '@buyseekk/shared';
import { highlightToOfferItem } from './offer-highlight';
import type { OfferHighlight } from './types';

const companyHighlight: OfferHighlight = {
  offerId: 'o1',
  label: 'recommended',
  price: 100000,
  currency: 'USD',
  requestTitle: 'Ferrari',
  sellerName: 'Franco Enrici',
  sellerType: 'COMPANY',
  businessName: 'BMW Miami',
  sellerState: 'FL',
  sellerCity: 'Miami',
  sellerCountry: 'US',
  sellerAvatarUrl: 'https://cdn.example/seller-logo.jpg',
  sellerRating: { avgStars: 5, reviewCount: 1 },
  comparisonSummary: {
    requestedBudget: 120000,
    offeredPrice: 100000,
    requestedLocation: 'Miami, FL · Brickell',
    offeredLocation: null,
    requestedRequirements: 'Rojo',
    offerMessage: 'Propuesta',
    imageCount: 1,
    offerImageUrls: ['https://cdn.example/car.jpg'],
    requestImageUrls: [],
    priceComparison: {
      budget: 120000,
      offerPrice: 100000,
      diff: 20000,
      status: 'under',
      label: 'Under budget',
    },
    requirementsMatch: 'partial',
    locationMatch: true,
  },
};

const offer = highlightToOfferItem(companyHighlight);
assert.equal(offer.seller?.name, 'Franco Enrici');
assert.equal(offer.seller?.businessName, 'BMW Miami');
assert.equal(offer.seller?.sellerType, 'COMPANY');
assert.equal(offer.seller?.avatarUrl, 'https://cdn.example/seller-logo.jpg');
assert.notEqual(offer.seller?.name, offer.seller?.businessName);

const identity = formatSellerBuyerIdentity(
  {
    role: 'SELLER',
    name: offer.seller!.name,
    sellerType: offer.seller!.sellerType,
    businessName: offer.seller!.businessName,
    state: offer.seller!.state,
    city: offer.seller!.city,
    country: offer.seller!.country,
  },
  'ES',
);
assert.equal(identity.titleLine, 'Franco Enrici / BMW Miami');
assert.equal(identity.detailLine, 'Miami, FL');

const legacyBugShape = formatSellerBuyerIdentity(
  {
    role: 'SELLER',
    name: 'BMW Miami',
    sellerType: undefined,
    businessName: undefined,
  },
  'ES',
);
assert.notEqual(identity.titleLine, legacyBugShape.titleLine);

console.log('offer-highlight: all assertions passed');
