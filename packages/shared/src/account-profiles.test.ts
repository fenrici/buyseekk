import assert from 'node:assert/strict';
import { avatarUrlForMode, buyerAvatarUrl, sellerAvatarUrl } from './account-profiles';
import { formatSellerBuyerIdentity } from './seller-profile';
import { notificationDeepLinkPath, notificationTargetMode } from './notification-routing';

const account = {
  email: 'franco@buyseek.us',
  name: 'Franco Enrici',
  role: 'BOTH' as const,
  buyerAvatarUrl: 'https://cdn.example/buyer.jpg',
  sellerAvatarUrl: 'https://cdn.example/seller.jpg',
};

assert.notEqual(account.buyerAvatarUrl, account.sellerAvatarUrl);
assert.equal(buyerAvatarUrl(account), account.buyerAvatarUrl);
assert.equal(sellerAvatarUrl(account), account.sellerAvatarUrl);

assert.equal(avatarUrlForMode(account, 'BUYER'), account.buyerAvatarUrl);
assert.equal(avatarUrlForMode(account, 'SELLER'), account.sellerAvatarUrl);
assert.equal(avatarUrlForMode({ ...account, activeMode: 'SELLER' }), account.sellerAvatarUrl);
assert.equal(avatarUrlForMode({ ...account, activeMode: 'BUYER' }), account.buyerAvatarUrl);

const afterBuyerChange = { ...account, buyerAvatarUrl: 'https://cdn.example/buyer-2.jpg' };
assert.equal(afterBuyerChange.sellerAvatarUrl, account.sellerAvatarUrl);
assert.notEqual(afterBuyerChange.buyerAvatarUrl, afterBuyerChange.sellerAvatarUrl);

const afterSellerChange = { ...account, sellerAvatarUrl: 'https://cdn.example/seller-2.jpg' };
assert.equal(afterSellerChange.buyerAvatarUrl, account.buyerAvatarUrl);
assert.notEqual(afterSellerChange.sellerAvatarUrl, afterSellerChange.buyerAvatarUrl);

assert.equal(avatarUrlForMode({ buyerAvatarUrl: null, sellerAvatarUrl: null, avatarUrl: null }, 'BUYER'), null);
assert.equal(avatarUrlForMode({ buyerAvatarUrl: null, sellerAvatarUrl: null }, 'SELLER'), null);

const company = formatSellerBuyerIdentity(
  {
    role: 'BOTH',
    sellerType: 'COMPANY',
    name: 'Franco Enrici',
    businessName: 'BMW Miami',
    businessType: 'DEALERSHIP',
    state: 'FL',
    city: 'Miami',
    country: 'US',
  },
  'ES',
);
assert.equal(company.titleLine, 'Franco Enrici / BMW Miami');
assert.equal(company.detailLine, 'Concesionaria · Miami, FL');
assert.ok(company.titleLine.startsWith('Franco Enrici /'));
assert.ok(!company.titleLine.startsWith('BMW Miami'));

const individual = formatSellerBuyerIdentity(
  {
    role: 'BOTH',
    sellerType: 'INDIVIDUAL',
    name: 'Franco Enrici',
    businessName: 'Should Not Replace Name',
    state: 'FL',
    city: 'Miami',
    country: 'US',
  },
  'ES',
);
assert.equal(individual.titleLine, 'Franco Enrici / Vendedor particular');
assert.equal(individual.detailLine, 'Miami, FL');

assert.equal(notificationTargetMode('NEW_OFFER'), 'BUYER');
assert.equal(notificationTargetMode('OFFER_ACCEPTED'), 'SELLER');
assert.equal(notificationTargetMode('OFFER_REJECTED'), 'SELLER');
assert.equal(notificationTargetMode('NEW_MATCHING_REQUEST'), 'SELLER');
assert.equal(notificationTargetMode('REQUEST_EXPIRING'), 'BUYER');
assert.equal(notificationTargetMode('NEW_MESSAGE', { recipientRole: 'buyer' }), 'BUYER');
assert.equal(notificationTargetMode('NEW_MESSAGE', { recipientRole: 'seller' }), 'SELLER');
assert.equal(notificationTargetMode('NEGOTIATION_ENDED', { recipientRole: 'seller' }), 'SELLER');
assert.equal(notificationTargetMode('NEGOTIATION_ENDED', { recipientRole: 'buyer' }), 'BUYER');

assert.equal(notificationDeepLinkPath('NEW_OFFER', 'o1'), '/buyer/offers');
assert.equal(notificationDeepLinkPath('OFFER_ACCEPTED', 'o1'), '/seller/offers');
assert.equal(notificationDeepLinkPath('NEW_MESSAGE', 'c1'), '/chats/c1');

assert.equal(account.email, 'franco@buyseek.us');
assert.equal(
  avatarUrlForMode({ ...account, role: 'BOTH', activeMode: 'BUYER' } as typeof account & { activeMode: 'BUYER' }, 'BUYER'),
  account.buyerAvatarUrl,
);
assert.equal(avatarUrlForMode({ ...account, activeMode: 'SELLER' }, 'SELLER'), account.sellerAvatarUrl);

console.log('account-profiles: all assertions passed');
