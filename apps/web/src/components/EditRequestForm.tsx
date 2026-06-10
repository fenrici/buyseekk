'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useT } from '@/lib/i18n';
import { RequestItem } from '@/lib/types';
import { ImageUpload } from '@/components/ImageUpload';

type EditMode = 'full' | 'limited' | 'locked';

function resolveEditMode(request: RequestItem): EditMode {
  const offers = request.offers ?? [];
  if (offers.some((o) => o.status === 'ACEPTADA')) return 'locked';
  if (request.pendingOffersCount > 0) return 'limited';
  return 'full';
}

export function EditRequestForm({
  request,
  onSuccess,
  onCancel,
}: {
  request: RequestItem;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const t = useT();
  const mode = resolveEditMode(request);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(request.title);
  const [requirements, setRequirements] = useState(request.requirements);
  const [budget, setBudget] = useState(String(request.budget));
  const [negotiable, setNegotiable] = useState(request.negotiable !== false);
  const [imageUrls, setImageUrls] = useState<string[]>(request.imageUrls ?? []);

  if (mode === 'locked') {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <p>{t('buyer.editLocked')}</p>
        <button type="button" onClick={onCancel} className="btn btn-ghost mt-3 text-sm">
          {t('common.cancel')}
        </button>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      if (mode === 'limited') {
        if (title.trim()) payload.title = title.trim();
        payload.requirements = requirements;
        payload.budget = parseInt(budget, 10);
        payload.negotiable = negotiable;
        payload.imageUrls = imageUrls;
        if (request.budgetPeriod) payload.budgetPeriod = request.budgetPeriod;
      } else {
        payload.title = title.trim();
        payload.requirements = requirements;
        payload.budget = parseInt(budget, 10);
        payload.negotiable = negotiable;
        payload.imageUrls = imageUrls;
        if (request.budgetPeriod) payload.budgetPeriod = request.budgetPeriod;
      }

      await api(`/requests/${request.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-800">{t('request.editTitle')}</h3>
        <button type="button" onClick={onCancel} className="text-xs font-semibold text-slate-500 hover:text-slate-700">
          {t('common.cancel')}
        </button>
      </div>

      {mode === 'limited' && (
        <p className="text-xs text-amber-700">{t('buyer.editLimitedHint')}</p>
      )}

      {error && <p className="rounded-lg bg-red-50 p-2 text-xs text-red-600">{error}</p>}

      <label className="block">
        <span className="text-xs font-semibold text-slate-600">{t('request.titlePlaceholder')}</span>
        <input className="input mt-1 w-full" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </label>

      <label className="block">
        <span className="text-xs font-semibold text-slate-600">{t('request.requirementsPlaceholder')}</span>
        <textarea
          className="input mt-1 w-full"
          rows={3}
          value={requirements}
          onChange={(e) => setRequirements(e.target.value)}
          required
        />
      </label>

      <label className="block">
        <span className="text-xs font-semibold text-slate-600">{t('request.budgetPlaceholder')}</span>
        <input
          className="input mt-1 w-full"
          type="number"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          required
        />
      </label>

      <div className="block">
        <span className="text-xs font-semibold text-slate-600">{t('request.negotiableHint')}</span>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${negotiable ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
            onClick={() => setNegotiable(true)}
          >
            {t('request.negotiable')}
          </button>
          <button
            type="button"
            className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${!negotiable ? 'border-slate-300 bg-slate-100 text-slate-800' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
            onClick={() => setNegotiable(false)}
          >
            {t('request.fixedPrice')}
          </button>
        </div>
      </div>

      <ImageUpload
        label={t('request.refPhotos')}
        hint={t('request.refPhotosHint')}
        value={imageUrls}
        onChange={setImageUrls}
      />

      <button type="submit" disabled={saving} className="btn btn-primary w-full">
        {saving ? t('common.saving') : t('request.save')}
      </button>
    </form>
  );
}
