import assert from 'node:assert/strict';
import { es, en } from './i18n/translations';

function get(obj: Record<string, unknown>, path: string): string {
  const val = path.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object' && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
  return typeof val === 'string' ? val : path;
}

const sellerOnboardingKeys = [
  'sellerOnboarding.title',
  'sellerOnboarding.subtitle',
  'sellerOnboarding.categoryLabel',
  'sellerOnboarding.categoryAutos',
  'sellerOnboarding.categoryRealEstate',
  'sellerOnboarding.submit',
  'sellerOnboarding.cancel',
  'sellerOnboarding.saving',
  'sellerOnboarding.error',
] as const;

for (const key of sellerOnboardingKeys) {
  const esValue = get(es as unknown as Record<string, unknown>, key);
  const enValue = get(en as unknown as Record<string, unknown>, key);
  assert.notEqual(esValue, key, `ES missing translation for ${key}`);
  assert.notEqual(enValue, key, `EN missing translation for ${key}`);
}

assert.equal(es.sellerOnboarding.categoryLabel, 'Rubro');
assert.equal(en.sellerOnboarding.categoryLabel, 'Category');
assert.notEqual(es.sellerOnboarding.categoryLabel, 'sellerOnboarding.categoryLabel');

console.log('seller-onboarding-i18n: all assertions passed');
