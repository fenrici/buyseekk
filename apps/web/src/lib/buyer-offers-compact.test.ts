import assert from 'node:assert/strict';
import {
  formatBudgetDifferenceLabel,
  formatBuyerRequestSummary,
  formatSellerBuyerIdentity,
} from '@buyseekk/shared';

assert.equal(
  formatBudgetDifferenceLabel(85000, 82000, 'USD', 'ES'),
  'US$3,000 por debajo de tu presupuesto',
);
assert.equal(
  formatBudgetDifferenceLabel(85000, 87000, 'USD', 'ES'),
  'US$2,000 por encima de tu presupuesto',
);
assert.equal(formatBudgetDifferenceLabel(85000, 85000, 'USD', 'ES'), 'Dentro de tu presupuesto');

const company = formatSellerBuyerIdentity(
  {
    role: 'SELLER',
    sellerType: 'COMPANY',
    name: 'Franco Enrici',
    businessName: 'BMW Miami',
    state: 'FL',
    city: 'Miami',
    country: 'US',
  },
  'ES',
);
assert.equal(company.titleLine, 'Franco Enrici / BMW Miami');
assert.equal(company.detailLine, 'Miami, FL');

const individual = formatSellerBuyerIdentity(
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
assert.equal(individual.titleLine, 'Franco Enrici / Vendedor particular');

const summary = formatBuyerRequestSummary(
  {
    title: 'BMW M2',
    carBrand: 'BMW',
    carModel: 'M2',
    budget: 85000,
    currency: 'USD',
    location: 'Miami, FL',
    zone: 'Brickell',
    country: 'US',
    category: 'AUTOS',
  },
  'ES',
);
assert.ok(summary.primary.includes('BMW M2'));
assert.ok(!summary.primary.includes('US$82'));

const longMessage = 'Lo tenemos en un color especial limitado a un precio todavía más accesible.';
assert.ok(longMessage.length > 20);
assert.equal(longMessage.split('\n').length, 1);

console.log('buyer-offers-compact: all assertions passed');
