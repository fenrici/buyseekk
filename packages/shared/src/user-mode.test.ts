import assert from 'node:assert/strict';
import {
  canEnterMode,
  hasCompletedSellerProfile,
  isBuyerCapableRole,
  isSellerCapableRole,
  resolveInitialLocale,
  resolveNavMode,
  roleAfterEnablingSeller,
} from './user-mode';

// --- Capacidades por rol ---
assert.equal(isBuyerCapableRole('BUYER'), true);
assert.equal(isBuyerCapableRole('BOTH'), true);
assert.equal(isBuyerCapableRole('SELLER'), false);
assert.equal(isSellerCapableRole('SELLER'), true);
assert.equal(isSellerCapableRole('BOTH'), true);
assert.equal(isSellerCapableRole('BUYER'), false);

// --- Perfil de vendedor completado ---
assert.equal(hasCompletedSellerProfile({ role: 'BUYER' }), false);
assert.equal(
  hasCompletedSellerProfile({ role: 'BOTH', sellerType: 'PERSONAL', sellerCategory: 'AUTOS' }),
  true,
);
assert.equal(
  hasCompletedSellerProfile({ role: 'BOTH', sellerType: null, sellerCategory: null }),
  false,
);

// --- ¿Puede entrar al modo? (la seguridad real depende de capacidad, no del modo) ---
// Comprador puro: puede modo comprador, no modo vendedor.
assert.equal(canEnterMode('BUYER', { role: 'BUYER' }), true);
assert.equal(canEnterMode('SELLER', { role: 'BUYER' }), false);
// Comprador sin perfil de vendedor aún (capacidad pero sin datos): no puede entrar como vendedor.
assert.equal(canEnterMode('SELLER', { role: 'BOTH', sellerType: null, sellerCategory: null }), false);
// Cuenta con perfil de vendedor: puede ambos modos.
assert.equal(
  canEnterMode('SELLER', { role: 'BOTH', sellerType: 'BUSINESS', sellerCategory: 'AUTOS' }),
  true,
);
assert.equal(
  canEnterMode('BUYER', { role: 'BOTH', sellerType: 'BUSINESS', sellerCategory: 'AUTOS' }),
  true,
);

// --- Modo de navegación efectivo (acotado a capacidades, sin mezclar) ---
assert.equal(resolveNavMode({ role: 'BUYER', activeMode: 'BUYER' }), 'BUYER');
assert.equal(resolveNavMode({ role: 'SELLER', activeMode: 'SELLER' }), 'SELLER');
assert.equal(resolveNavMode({ role: 'BOTH', activeMode: 'SELLER' }), 'SELLER');
assert.equal(resolveNavMode({ role: 'BOTH', activeMode: 'BUYER' }), 'BUYER');
// activeMode incoherente con la capacidad → cae a un modo válido (no expone UI sin permiso).
assert.equal(resolveNavMode({ role: 'BUYER', activeMode: 'SELLER' }), 'BUYER');
assert.equal(resolveNavMode({ role: 'SELLER', activeMode: 'BUYER' }), 'SELLER');

// --- Habilitar vendedor conserva capacidad de comprador ---
assert.equal(roleAfterEnablingSeller('BUYER'), 'BOTH');
assert.equal(roleAfterEnablingSeller('BOTH'), 'BOTH');
assert.equal(roleAfterEnablingSeller('SELLER'), 'SELLER');

// --- Idioma inicial: preferencia manual > navegador > default ES ---
assert.equal(resolveInitialLocale('EN', 'es-AR'), 'EN'); // manual gana
assert.equal(resolveInitialLocale('ES', 'en-US'), 'ES'); // manual gana
assert.equal(resolveInitialLocale(null, 'en-US'), 'EN'); // detecta navegador
assert.equal(resolveInitialLocale(null, 'es-AR'), 'ES');
assert.equal(resolveInitialLocale(null, null), 'ES'); // default
assert.equal(resolveInitialLocale(undefined, 'fr-FR'), 'ES'); // idioma no soportado → ES

console.log('user-mode: all assertions passed');
