'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import {
  BEDROOM_OPTIONS,
  CAR_BRAND_LIST,
  CAR_COLORS,
  citiesForCountry,
  MILEAGE_PRESETS,
  modelsForBrand,
  SQM_PRESETS,
  zonesForCountryAndCity,
} from '@buyseekk/shared';
import { useT } from '@/lib/i18n';
import { User } from '@/lib/types';
import { ImageUpload } from '@/components/ImageUpload';

export function CreateRequestForm({ user, onSuccess }: { user: User; onSuccess: () => void }) {
  const t = useT();
  const [error, setError] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const cities = citiesForCountry(user.country);
  const defaultBrand = CAR_BRAND_LIST[0] ?? '';
  const [form, setForm] = useState<{
    category: string;
    title: string;
    requirements: string;
    budget: string;
    location: string;
    country: User['country'];
    currency: User['currency'];
    operation: string;
    carBrand: string;
    carModel: string;
    carColor: string;
    maxMileage: string;
    zone: string;
    bedrooms: string;
    minSqm: string;
    maxSqm: string;
  }>({
    category: 'AUTOS',
    title: '',
    requirements: '',
    budget: '',
    location: cities[0] ?? '',
    country: user.country,
    currency: user.currency,
    operation: 'COMPRA',
    carBrand: defaultBrand,
    carModel: modelsForBrand(defaultBrand)[0] ?? '',
    carColor: CAR_COLORS[0],
    maxMileage: String(MILEAGE_PRESETS[2] ?? 30000),
    zone: zonesForCountryAndCity(user.country, cities[0] ?? '')[0] ?? '',
    bedrooms: '2',
    minSqm: '',
    maxSqm: '',
  });

  const isAuto = form.category === 'AUTOS';
  const models = isAuto && form.carBrand ? modelsForBrand(form.carBrand) : [];
  const zones = zonesForCountryAndCity(form.country, form.location);

  function updateField(field: string, value: string) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'category' && value !== 'AUTOS') {
        next.carBrand = '';
        next.carModel = '';
        next.carColor = '';
        next.maxMileage = '';
        const allowedZones = zonesForCountryAndCity(next.country, next.location);
        next.zone = allowedZones[0] ?? '';
      }
      if (field === 'category' && value === 'AUTOS') {
        const brand = CAR_BRAND_LIST[0] ?? '';
        next.carBrand = brand;
        next.carModel = modelsForBrand(brand)[0] ?? '';
        next.carColor = CAR_COLORS[0];
        next.maxMileage = String(MILEAGE_PRESETS[2] ?? 30000);
        const autoZones = zonesForCountryAndCity(next.country, next.location);
        next.zone = autoZones[0] ?? '';
        next.bedrooms = '2';
        next.minSqm = '';
        next.maxSqm = '';
      }
      if (field === 'carBrand') {
        const brandModels = modelsForBrand(value);
        next.carModel = brandModels[0] ?? '';
      }
      if (field === 'location') {
        const allowedZones = zonesForCountryAndCity(next.country, value);
        if (!allowedZones.includes(next.zone)) {
          next.zone = allowedZones[0] ?? '';
        }
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!form.zone) {
      setError(t('request.zoneRequired'));
      return;
    }

    if (isAuto) {
      if (!form.carBrand || !form.carModel || !form.carColor || !form.maxMileage) {
        setError(t('request.autoRequired'));
        return;
      }
    } else {
      if (!form.bedrooms) {
        setError(t('request.bedroomsRequired'));
        return;
      }
    }

    try {
      const payload: Record<string, unknown> = {
        category: form.category,
        requirements: form.requirements,
        budget: parseInt(form.budget, 10),
        location: form.location,
        country: form.country,
        currency: form.currency,
        operation: form.operation,
        budgetPeriod: form.operation === 'ALQUILER' ? '/mes' : undefined,
        imageUrls,
      };

      if (isAuto) {
        payload.carBrand = form.carBrand;
        payload.carModel = form.carModel;
        payload.carColor = form.carColor;
        payload.maxMileage = parseInt(form.maxMileage, 10);
        payload.zone = form.zone;
        payload.title = form.title.trim() || t('request.autoTitle', { brand: form.carBrand, model: form.carModel });
      } else {
        payload.title = form.title.trim();
        payload.zone = form.zone;
        payload.bedrooms = parseInt(form.bedrooms, 10);
        if (form.minSqm) payload.minSqm = parseInt(form.minSqm, 10);
        if (form.maxSqm) payload.maxSqm = parseInt(form.maxSqm, 10);
      }

      await api('/requests', { method: 'POST', body: JSON.stringify(payload) });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 rounded-xl border bg-white p-6 shadow-sm md:grid-cols-2">
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600 md:col-span-2">{error}</p>}

      <select className="input" value={form.category} onChange={(e) => updateField('category', e.target.value)}>
        <option value="AUTOS">{t('seller.autos')}</option>
        <option value="INMOBILIARIA">{t('seller.realEstate')}</option>
      </select>
      <select className="input" value={form.operation} onChange={(e) => updateField('operation', e.target.value)}>
        <option value="COMPRA">{t('request.buy')}</option>
        <option value="ALQUILER">{t('request.rent')}</option>
      </select>

      {isAuto ? (
        <div className="md:col-span-2 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
          <p className="text-sm font-bold text-indigo-900">{t('request.autoSection')}</p>
          <p className="mt-1 text-xs text-indigo-700/80">{t('request.autoSectionHint')}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold text-slate-600">{t('request.carBrand')} *</span>
              <select className="input mt-1 w-full" value={form.carBrand} onChange={(e) => updateField('carBrand', e.target.value)} required>
                {CAR_BRAND_LIST.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-600">{t('request.carModel')} *</span>
              <select className="input mt-1 w-full" value={form.carModel} onChange={(e) => updateField('carModel', e.target.value)} required>
                {models.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-600">{t('request.carColor')} *</span>
              <select className="input mt-1 w-full" value={form.carColor} onChange={(e) => updateField('carColor', e.target.value)} required>
                {CAR_COLORS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-600">{t('request.selectMileage')} *</span>
              <select className="input mt-1 w-full" value={form.maxMileage} onChange={(e) => updateField('maxMileage', e.target.value)} required>
                {MILEAGE_PRESETS.map((m) => (
                  <option key={m} value={String(m)}>
                    ≤ {m.toLocaleString()} {t('seller.miles')}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      ) : (
        <input
          className="input md:col-span-2"
          placeholder={t('request.titlePlaceholder')}
          value={form.title}
          onChange={(e) => updateField('title', e.target.value)}
          required
        />
      )}

      <label className="block md:col-span-2">
        <span className="text-xs font-semibold text-slate-600">{t('request.zone')} *</span>
        <select
          className="input mt-1 w-full"
          value={form.zone}
          onChange={(e) => updateField('zone', e.target.value)}
          required
        >
          {zones.map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </select>
      </label>

      {!isAuto && (
        <>
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">{t('request.bedrooms')} *</span>
            <select
              className="input mt-1 w-full"
              value={form.bedrooms}
              onChange={(e) => updateField('bedrooms', e.target.value)}
              required
            >
              {BEDROOM_OPTIONS.map((n) => (
                <option key={n} value={String(n)}>
                  {n} {t('request.bedroomsShort')}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">{t('request.minSqm')}</span>
            <select className="input mt-1 w-full" value={form.minSqm} onChange={(e) => updateField('minSqm', e.target.value)}>
              <option value="">{t('request.noMinSqm')}</option>
              {SQM_PRESETS.map((n) => (
                <option key={n} value={String(n)}>≥ {n} m²</option>
              ))}
            </select>
          </label>
          <label className="block md:col-span-2">
            <span className="text-xs font-semibold text-slate-600">{t('request.maxSqm')}</span>
            <select className="input mt-1 w-full" value={form.maxSqm} onChange={(e) => updateField('maxSqm', e.target.value)}>
              <option value="">{t('request.noMaxSqm')}</option>
              {SQM_PRESETS.map((n) => (
                <option key={n} value={String(n)}>≤ {n} m²</option>
              ))}
            </select>
          </label>
        </>
      )}

      <input className="input" type="number" placeholder={t('request.budgetPlaceholder')} value={form.budget} onChange={(e) => updateField('budget', e.target.value)} required />
      <label className="block">
        <span className="text-xs font-semibold text-slate-600">{t('request.city')} *</span>
        <select className="input mt-1 w-full" value={form.location} onChange={(e) => updateField('location', e.target.value)} required>
          {citiesForCountry(form.country as User['country']).map((city) => (
            <option key={city} value={city}>{city}</option>
          ))}
        </select>
      </label>
      <input className="input bg-slate-50" value={form.country === 'US' ? t('auth.countryUS') : t('auth.countryAR')} readOnly />
      <select className="input" value={form.currency} onChange={(e) => updateField('currency', e.target.value)}>
        <option value="ARS">ARS</option>
        <option value="USD">USD</option>
      </select>
      <textarea className="input md:col-span-2" rows={4} placeholder={t('request.requirementsPlaceholder')} value={form.requirements} onChange={(e) => updateField('requirements', e.target.value)} required />
      <div className="md:col-span-2">
        <ImageUpload label={t('request.refPhotos')} hint={t('request.refPhotosHint')} value={imageUrls} onChange={setImageUrls} />
      </div>
      <button className="btn btn-primary md:col-span-2">{t('request.publish')}</button>
    </form>
  );
}
