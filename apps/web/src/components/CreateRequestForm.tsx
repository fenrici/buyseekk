'use client';

import { useState } from 'react';
import { api, formatMoney } from '@/lib/api';
import {
  BEDROOM_OPTIONS,
  CAR_BRAND_LIST,
  CAR_COLORS,
  carYearPresets,
  citiesForCountry,
  maxAmountFor,
  MILEAGE_PRESETS,
  modelsForBrand,
  SQM_PRESETS,
  zonesForCountryAndCity,
} from '@buyseekk/shared';
import { useT } from '@/lib/i18n';
import { budgetLimitErrorKey, budgetMaxLabel } from '@/lib/money-limits';
import { ValidationAlerts } from '@/components/ValidationAlerts';
import { spamFieldErrors } from '@/lib/spam';
import { User } from '@/lib/types';
import { ImageUpload } from '@/components/ImageUpload';

const TOTAL_STEPS = 3;

type FormState = {
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
  carYearMin: string;
  maxMileage: string;
  zone: string;
  bedrooms: string;
  minSqm: string;
  maxSqm: string;
  negotiable: boolean;
};

function stepDotClass(active: boolean, done: boolean) {
  if (active) return 'border-indigo-400 bg-indigo-600 text-white shadow-sm ring-4 ring-indigo-500/20';
  if (done) return 'border-indigo-400/60 bg-indigo-500/20 text-indigo-300';
  return 'border-white/15 bg-white/5 text-slate-500';
}

function toggleBtnClass(selected: boolean) {
  return selected
    ? 'border-indigo-400/50 bg-indigo-500/20 text-indigo-200'
    : 'border-white/12 bg-white/5 text-slate-400 hover:border-white/20 hover:bg-white/[0.08]';
}

function StepProgress({
  step,
  labels,
  progressLabel,
}: {
  step: number;
  labels: [string, string, string];
  progressLabel: string;
}) {
  const trackPct = ((step - 1) / (TOTAL_STEPS - 1)) * 100;

  return (
    <div className="mb-5 sm:mb-6">
      {/* Mobile: título + barra + puntos alineados */}
      <div className="sm:hidden">
        <div className="flex items-start justify-between gap-3">
          <p className="text-base font-semibold leading-snug text-white">{labels[step - 1]}</p>
          <span className="shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-slate-400">
            {progressLabel}
          </span>
        </div>
        <div className="relative mt-5 px-1">
          <div className="absolute left-5 right-5 top-1/2 h-0.5 -translate-y-1/2 bg-white/10" aria-hidden />
          <div
            className="absolute left-5 top-1/2 h-0.5 -translate-y-1/2 bg-indigo-500 transition-all duration-300 ease-out"
            style={{ width: `calc((100% - 2.5rem) * ${trackPct / 100})` }}
            aria-hidden
          />
          <div className="relative flex justify-between">
            {labels.map((label, index) => {
              const n = index + 1;
              const active = step === n;
              const done = step > n;
              return (
                <div key={label} className="flex flex-col items-center gap-1.5">
                  <span
                    className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors ${stepDotClass(active, done)}`}
                  >
                    {done ? '✓' : n}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Desktop: stepper horizontal con etiquetas */}
      <div className="hidden sm:block">
        <div className="flex items-start">
          {labels.map((label, index) => {
            const n = index + 1;
            const active = step === n;
            const done = step > n;
            return (
              <div key={label} className="flex min-w-0 flex-1 items-start last:flex-none">
                <div className="flex min-w-0 flex-col items-center gap-2">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors ${stepDotClass(active, done)}`}
                  >
                    {done ? '✓' : n}
                  </span>
                  <span
                    className={`max-w-[8rem] text-center text-xs font-semibold leading-tight ${
                      active ? 'text-indigo-300' : done ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {index < labels.length - 1 && (
                  <div
                    className={`mx-2 mt-4 h-0.5 min-w-6 flex-1 rounded-full transition-colors ${
                      done ? 'bg-indigo-500' : 'bg-white/10'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function CreateRequestForm({ user, onSuccess }: { user: User; onSuccess: () => void }) {
  const t = useT();
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const cities = citiesForCountry(user.country);
  const defaultBrand = CAR_BRAND_LIST[0] ?? '';
  const [form, setForm] = useState<FormState>({
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
    carYearMin: String(carYearPresets()[3] ?? new Date().getFullYear() - 3),
    maxMileage: String(MILEAGE_PRESETS[2] ?? 30000),
    zone: zonesForCountryAndCity(user.country, cities[0] ?? '')[0] ?? '',
    bedrooms: '2',
    minSqm: '',
    maxSqm: '',
    negotiable: true,
  });

  const isAuto = form.category === 'AUTOS';
  const models = isAuto && form.carBrand ? modelsForBrand(form.carBrand) : [];
  const zones = zonesForCountryAndCity(form.country, form.location);
  const stepLabels: [string, string, string] = [
    t('request.stepWhat'),
    t('request.stepBudget'),
    t('request.stepDetails'),
  ];

  function updateField(field: string, value: string) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'category' && value !== 'AUTOS') {
        next.carBrand = '';
        next.carModel = '';
        next.carColor = '';
        next.carYearMin = '';
        next.maxMileage = '';
        const allowedZones = zonesForCountryAndCity(next.country, next.location);
        next.zone = allowedZones[0] ?? '';
      }
      if (field === 'category' && value === 'AUTOS') {
        next.operation = 'COMPRA';
        const brand = CAR_BRAND_LIST[0] ?? '';
        next.carBrand = brand;
        next.carModel = modelsForBrand(brand)[0] ?? '';
        next.carColor = CAR_COLORS[0];
        next.carYearMin = String(carYearPresets()[3] ?? new Date().getFullYear() - 3);
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

  function validateStep(targetStep: number): string | null {
    if (targetStep >= 1) {
      if (!form.zone) return t('request.zoneRequired');
      if (isAuto) {
        if (!form.carBrand || !form.carModel || !form.carColor || !form.carYearMin || !form.maxMileage) {
          return t('request.autoRequired');
        }
      } else {
        if (!form.title.trim()) return t('request.titleRequired');
        const titleErrors = spamFieldErrors(t, form.title);
        if (titleErrors.length) return titleErrors.join('\n');
        if (!form.bedrooms) return t('request.bedroomsRequired');
      }
    }
    if (targetStep >= 2) {
      const budget = parseInt(form.budget, 10);
      const isRent = form.operation === 'ALQUILER';
      if (!form.budget || Number.isNaN(budget) || budget < 1) return t('request.budgetRequired');
      if (budgetLimitErrorKey(budget, form.currency, isRent)) {
        return t('request.budgetMax', { max: budgetMaxLabel(form.currency, isRent) });
      }
      if (!form.location) return t('request.zoneRequired');
    }
    if (targetStep >= 3) {
      if (form.requirements.trim().length < 10) return t('request.requirementsMin');
      const reqErrors = spamFieldErrors(t, form.requirements);
      if (reqErrors.length) return reqErrors.join('\n');
    }
    return null;
  }

  function goNext() {
    setError('');
    const validationError = validateStep(step);
    if (validationError) {
      setError(validationError);
      return;
    }
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }

  function goBack() {
    setError('');
    setStep((s) => Math.max(s - 1, 1));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const validationError = validateStep(3);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
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
        negotiable: form.negotiable,
        imageUrls,
      };

      if (isAuto) {
        payload.carBrand = form.carBrand;
        payload.carModel = form.carModel;
        payload.carColor = form.carColor;
        payload.carYearMin = parseInt(form.carYearMin, 10);
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
    } finally {
      setSubmitting(false);
    }
  }

  const summaryTitle = isAuto
    ? form.title.trim() || t('request.autoTitle', { brand: form.carBrand, model: form.carModel })
    : form.title.trim();
  const budgetLabel = formatMoney(
    parseInt(form.budget, 10) || 0,
    form.currency,
    form.operation === 'ALQUILER' ? '/mes' : '',
  );

  const progressLabel = t('request.stepProgress', { step: String(step), total: String(TOTAL_STEPS) });
  const isRent = form.operation === 'ALQUILER';
  const budgetMax = maxAmountFor(form.currency, isRent);

  return (
    <form onSubmit={handleSubmit} className="publish-form card p-4 sm:p-6">
      <StepProgress step={step} labels={stepLabels} progressLabel={progressLabel} />
      <p className="mb-4 text-sm text-slate-500">
        {step === 1 && t('request.stepWhatHint')}
        {step === 2 && t('request.stepBudgetHint')}
        {step === 3 && t('request.stepDetailsHint')}
      </p>

      {error && <ValidationAlerts message={error} className="mb-4" />}

      {step === 1 && (
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block md:col-span-2">
            <span className="text-xs font-semibold text-slate-600">{t('request.category')} *</span>
            <select
              className="input mt-1 w-full"
              value={form.category}
              onChange={(e) => updateField('category', e.target.value)}
            >
              <option value="AUTOS">{t('seller.autos')}</option>
              <option value="INMOBILIARIA">{t('seller.realEstate')}</option>
            </select>
          </label>

          {!isAuto && (
            <>
              <label className="block md:col-span-2">
                <span className="text-xs font-semibold text-slate-600">{t('request.titlePlaceholder')} *</span>
                <input
                  className="input mt-1 w-full"
                  value={form.title}
                  onChange={(e) => updateField('title', e.target.value)}
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">{t('request.operation')} *</span>
                <select className="input mt-1 w-full" value={form.operation} onChange={(e) => updateField('operation', e.target.value)}>
                  <option value="COMPRA">{t('request.buy')}</option>
                  <option value="ALQUILER">{t('request.rent')}</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">{t('request.bedrooms')} *</span>
                <select
                  className="input mt-1 w-full"
                  value={form.bedrooms}
                  onChange={(e) => updateField('bedrooms', e.target.value)}
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
              <label className="block">
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

          {isAuto && (
            <div className="md:col-span-2 rounded-xl border border-indigo-500/25 bg-indigo-500/10 p-4">
              <p className="text-sm font-bold text-indigo-200">{t('request.autoSection')}</p>
              <p className="mt-1 text-xs text-indigo-300/70">{t('request.autoSectionHint')}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-semibold text-slate-600">{t('request.carBrand')} *</span>
                  <select className="input mt-1 w-full" value={form.carBrand} onChange={(e) => updateField('carBrand', e.target.value)}>
                    {CAR_BRAND_LIST.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-slate-600">{t('request.carModel')} *</span>
                  <select className="input mt-1 w-full" value={form.carModel} onChange={(e) => updateField('carModel', e.target.value)}>
                    {models.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-slate-600">{t('request.carColor')} *</span>
                  <select className="input mt-1 w-full" value={form.carColor} onChange={(e) => updateField('carColor', e.target.value)}>
                    {CAR_COLORS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-slate-600">{t('request.carYear')} *</span>
                  <select className="input mt-1 w-full" value={form.carYearMin} onChange={(e) => updateField('carYearMin', e.target.value)}>
                    {carYearPresets().map((y) => (
                      <option key={y} value={String(y)}>≥ {y}</option>
                    ))}
                  </select>
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-xs font-semibold text-slate-600">{t('request.selectMileage')} *</span>
                  <select className="input mt-1 w-full" value={form.maxMileage} onChange={(e) => updateField('maxMileage', e.target.value)}>
                    {MILEAGE_PRESETS.map((m) => (
                      <option key={m} value={String(m)}>
                        ≤ {m.toLocaleString()} {t('seller.miles')}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          )}

          <label className="block md:col-span-2">
            <span className="text-xs font-semibold text-slate-600">{t('request.zone')} *</span>
            <select className="input mt-1 w-full" value={form.zone} onChange={(e) => updateField('zone', e.target.value)}>
              {zones.map((z) => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
          </label>
        </div>
      )}

      {step === 2 && (
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">{t('request.budgetPlaceholder')} *</span>
            <input
              className="input mt-1 w-full"
              type="number"
              min={1}
              max={budgetMax}
              value={form.budget}
              onChange={(e) => updateField('budget', e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">{t('request.city')} *</span>
            <select className="input mt-1 w-full" value={form.location} onChange={(e) => updateField('location', e.target.value)}>
              {citiesForCountry(form.country as User['country']).map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">{t('auth.currency')}</span>
            <select className="input mt-1 w-full" value={form.currency} onChange={(e) => updateField('currency', e.target.value)}>
              <option value="ARS">ARS</option>
              <option value="USD">USD</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">{t('auth.country')}</span>
            <input
              className="input mt-1 w-full bg-white/5"
              value={form.country === 'US' ? t('auth.countryUS') : t('auth.countryAR')}
              readOnly
            />
          </label>
          <div className="md:col-span-2">
            <p className="text-xs font-semibold text-slate-600">{t('request.negotiable')}</p>
            <p className="mt-1 text-xs text-slate-500">{t('request.negotiableHint')}</p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${toggleBtnClass(form.negotiable)}`}
                onClick={() => setForm((prev) => ({ ...prev, negotiable: true }))}
              >
                {t('request.negotiable')}
              </button>
              <button
                type="button"
                className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${toggleBtnClass(!form.negotiable)}`}
                onClick={() => setForm((prev) => ({ ...prev, negotiable: false }))}
              >
                {t('request.fixedPrice')}
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{t('request.summaryTitle')}</p>
            <p className="mt-2 font-semibold text-slate-200">{summaryTitle}</p>
            <p className="mt-1 text-sm text-slate-400">
              {form.location} · {form.zone}
              {isAuto && ` · ${form.carBrand} ${form.carModel} · ≥ ${form.carYearMin}`}
            </p>
            <p className="mt-1 text-sm font-medium text-indigo-300">
              {budgetLabel}
              {form.negotiable ? ` · ${t('request.negotiable')}` : ` · ${t('request.fixedPrice')}`}
            </p>
          </div>

          <label className="block">
            <span className="text-xs font-semibold text-slate-600">{t('request.requirementsPlaceholder')} *</span>
            <textarea
              className="input mt-1 w-full"
              rows={4}
              value={form.requirements}
              onChange={(e) => updateField('requirements', e.target.value)}
            />
          </label>

          <ImageUpload
            label={t('request.refPhotos')}
            hint={t('request.refPhotosHint')}
            value={imageUrls}
            onChange={setImageUrls}
          />
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="hidden text-xs text-slate-400 sm:block">{progressLabel}</p>
        <div className="flex w-full gap-2 sm:w-auto">
          {step > 1 && (
            <button type="button" onClick={goBack} className="btn btn-ghost min-h-11 flex-1 text-sm sm:flex-none">
              {t('request.backStep')}
            </button>
          )}
          {step < TOTAL_STEPS ? (
            <button type="button" onClick={goNext} className="btn btn-primary min-h-11 flex-1 text-sm sm:flex-none">
              {t('request.continue')}
            </button>
          ) : (
            <button type="submit" className="btn btn-primary min-h-11 flex-1 text-sm sm:flex-none" disabled={submitting}>
              {submitting ? t('common.saving') : t('request.publish')}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
