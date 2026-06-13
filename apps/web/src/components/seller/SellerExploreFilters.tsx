'use client';

import { useCallback, useState } from 'react';
import { citiesForCountry, clearAllSellerFilters, type SellerFilterState } from '@buyseekk/shared';
import { api } from '@/lib/api';
import { buildSellerFilterChips, summarizeSellerFilters, type SavedSearchItem } from '@/lib/seller-filter-labels';
import { useT } from '@/lib/i18n';
import { SellerFiltersPanel } from '@/components/SellerFiltersPanel';
import type { useSellerExplore } from '@/hooks/useSellerExplore';

type Explore = ReturnType<typeof useSellerExplore>;

type Props = {
  explore: Explore;
};

function SavedSearchList({
  items,
  onApply,
  onSetPrimary,
  onDelete,
  t,
}: {
  items: SavedSearchItem[];
  onApply: (item: SavedSearchItem) => void;
  onSetPrimary: (id: string) => void;
  onDelete: (id: string) => void;
  t: ReturnType<typeof useT>;
}) {
  if (items.length === 0) {
    return <p className="seller-saved-empty">{t('savedSearch.empty')}</p>;
  }

  return (
    <ul className="seller-saved-list">
      {items.map((item) => (
        <li key={item.id} className="seller-saved-item">
          <button type="button" className="seller-saved-apply" onClick={() => onApply(item)}>
            <span className="seller-saved-name">
              {item.name}
              {item.isDefault && <span className="seller-saved-badge">{t('savedSearch.primary')}</span>}
            </span>
          </button>
          <div className="seller-saved-actions">
            {!item.isDefault && (
              <button type="button" className="seller-saved-action" onClick={() => onSetPrimary(item.id)}>
                {t('savedSearch.setPrimary')}
              </button>
            )}
            <button type="button" className="seller-saved-action seller-saved-action--danger" onClick={() => onDelete(item.id)}>
              {t('savedSearch.deleteAction')}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function SellerExploreFilters({ explore }: Props) {
  const t = useT();
  const {
    user,
    lockedCategory,
    filters,
    draft,
    setDraft,
    sheetOpen,
    setSheetOpen,
    openSheet,
    applyFilters,
    patchFilters,
    clearAll,
    removeChip,
    activeCount,
    savedSearches,
    reloadSaved,
    applySaved,
    total,
    loading,
    draftEstate,
    draftAuto,
    setDraftEstate,
    setDraftAuto,
    setDraftField,
    estateFilters,
    autoFilters,
  } = explore;

  const [desktopTab, setDesktopTab] = useState<'filters' | 'saved'>('filters');
  const [mobileTab, setMobileTab] = useState<'filters' | 'saved'>('filters');
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveDefault, setSaveDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [toast, setToast] = useState('');

  const chips = buildSellerFilterChips(filters, lockedCategory, t);
  const cities = citiesForCountry(user.country);
  const showCategoryFilter = !lockedCategory;
  const desktopCategory = lockedCategory || filters.category;
  const draftCategory = lockedCategory || draft.category;

  const categoryFilters = [
    { id: '', label: t('seller.all') },
    { id: 'AUTOS', label: t('seller.autos') },
    { id: 'INMOBILIARIA', label: t('seller.realEstate') },
  ];
  const operationFilters = [
    { id: '', label: t('seller.allOperations') },
    { id: 'COMPRA', label: t('request.buy') },
    { id: 'ALQUILER', label: t('request.rent') },
  ];

  const patchInstant = useCallback(
    (patch: Partial<SellerFilterState>) => {
      patchFilters(patch, false);
    },
    [patchFilters],
  );

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(''), 2400);
  }

  async function handleSaveSearch() {
    if (!saveName.trim() || saving) return;
    setSaving(true);
    setSaveError('');
    try {
      await api('/saved-searches', {
        method: 'POST',
        body: JSON.stringify({
          name: saveName.trim(),
          category: lockedCategory || filters.category || null,
          filters,
          isDefault: saveDefault,
        }),
      });
      await reloadSaved();
      setSaveOpen(false);
      setSaveName('');
      setSaveDefault(false);
      showToast(t('savedSearch.saved'));
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t('savedSearch.saveError'));
    } finally {
      setSaving(false);
    }
  }

  async function deleteSaved(id: string) {
    if (!window.confirm(t('savedSearch.deleteConfirm'))) return;
    await api(`/saved-searches/${id}`, { method: 'DELETE' });
    await reloadSaved();
    showToast(t('savedSearch.deleted'));
  }

  async function setPrimary(id: string) {
    await api(`/saved-searches/${id}/default`, { method: 'PATCH' });
    await reloadSaved();
    showToast(t('savedSearch.defaultUpdated'));
  }

  const filterTabs = (tab: 'filters' | 'saved', setTab: (v: 'filters' | 'saved') => void) => (
    <div className="seller-filter-sheet-tabs seller-filter-tabs">
      <button type="button" className={tab === 'filters' ? 'active' : ''} onClick={() => setTab('filters')}>
        {t('seller.filtersTitle')}
      </button>
      <button type="button" className={tab === 'saved' ? 'active' : ''} onClick={() => setTab('saved')}>
        {t('savedSearch.title')}
      </button>
    </div>
  );

  return (
    <>
      <aside className="seller-filters-sidebar" aria-label={t('seller.filtersTitle')}>
        {filterTabs(desktopTab, setDesktopTab)}
        {desktopTab === 'filters' ? (
          <>
            <SellerFiltersPanel
              user={user}
              category={desktopCategory}
              onCategoryChange={
                showCategoryFilter
                  ? (id) => patchInstant({ category: id, ...(id === 'AUTOS' ? { operation: '' } : {}) })
                  : undefined
              }
              operation={filters.operation}
              onOperationChange={(id) => patchInstant({ operation: id })}
              location={filters.location}
              onLocationChange={(city) => patchInstant({ location: city, zone: '' })}
              zone={filters.zone}
              onZoneChange={(z) => patchInstant({ zone: z })}
              estateFilters={estateFilters}
              onEstateFiltersChange={(estate) => patchInstant(estate)}
              autoFilters={autoFilters}
              onAutoFiltersChange={(auto) => patchInstant(auto)}
              categoryFilters={categoryFilters}
              operationFilters={operationFilters}
              cities={cities}
              showCategoryFilter={showCategoryFilter}
            />
            {activeCount > 0 && (
              <div className="seller-sidebar-actions">
                <button type="button" className="seller-filter-clear" onClick={clearAll}>
                  {t('seller.clearFilters')}
                </button>
                <button type="button" className="seller-filter-save-link" onClick={() => setSaveOpen(true)}>
                  {t('savedSearch.save')}
                </button>
              </div>
            )}
          </>
        ) : (
          <SavedSearchList
            items={savedSearches}
            onApply={applySaved}
            onSetPrimary={setPrimary}
            onDelete={deleteSaved}
            t={t}
          />
        )}
      </aside>

      <div className="seller-filters-mobile">
        <div className="seller-filter-toolbar-wrap">
          <div className="seller-filter-toolbar">
            <button type="button" className="seller-filter-trigger" onClick={openSheet}>
              {t('seller.filtersBtn')}
              {activeCount > 0 && <span className="seller-filter-count">{activeCount}</span>}
            </button>
            {activeCount > 0 && (
              <button type="button" className="seller-filter-clear" onClick={clearAll}>
                {t('seller.clearFilters')}
              </button>
            )}
            {activeCount > 0 && (
              <button type="button" className="seller-filter-save-link" onClick={() => setSaveOpen(true)}>
                {t('savedSearch.save')}
              </button>
            )}
          </div>

          {chips.length > 0 && (
            <div className="seller-filter-chips" role="list" aria-label={t('seller.activeFilters')}>
              {chips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  className="seller-filter-chip"
                  onClick={() => removeChip(chip.key)}
                  aria-label={`${t('seller.removeFilter')} ${chip.label}`}
                >
                  {chip.label}
                  <span aria-hidden>×</span>
                </button>
              ))}
            </div>
          )}

          {sheetOpen && (
            <div className="seller-filter-sheet-backdrop" onClick={() => setSheetOpen(false)} aria-hidden />
          )}

          <div
            className={`seller-filter-sheet${sheetOpen ? ' seller-filter-sheet--open' : ''}`}
            role="dialog"
            aria-modal={sheetOpen}
            aria-hidden={!sheetOpen}
          >
            <div className="seller-filter-sheet-header">
              {filterTabs(mobileTab, setMobileTab)}
              <button
                type="button"
                className="seller-filter-sheet-close"
                onClick={() => setSheetOpen(false)}
                aria-label={t('common.cancel')}
              >
                ✕
              </button>
            </div>

            <div className="seller-filter-sheet-body">
              {mobileTab === 'filters' ? (
                <SellerFiltersPanel
                  user={user}
                  category={draftCategory}
                  onCategoryChange={showCategoryFilter ? (id) => setDraftField('category', id) : undefined}
                  operation={draft.operation}
                  onOperationChange={(id) => setDraftField('operation', id)}
                  location={draft.location}
                  onLocationChange={(city) => setDraftField('location', city)}
                  zone={draft.zone}
                  onZoneChange={(z) => setDraftField('zone', z)}
                  estateFilters={draftEstate}
                  onEstateFiltersChange={setDraftEstate}
                  autoFilters={draftAuto}
                  onAutoFiltersChange={setDraftAuto}
                  categoryFilters={categoryFilters}
                  operationFilters={operationFilters}
                  cities={cities}
                  showCategoryFilter={showCategoryFilter}
                />
              ) : (
                <SavedSearchList
                  items={savedSearches}
                  onApply={applySaved}
                  onSetPrimary={setPrimary}
                  onDelete={deleteSaved}
                  t={t}
                />
              )}
            </div>

            {mobileTab === 'filters' && (
              <div className="seller-filter-sheet-footer">
                <button
                  type="button"
                  className="seller-filter-footer-clear"
                  onClick={() => setDraft(clearAllSellerFilters(lockedCategory || undefined))}
                >
                  {t('seller.clearFilters')}
                </button>
                <button
                  type="button"
                  className="seller-filter-footer-apply"
                  disabled={loading}
                  onClick={() => applyFilters(draft, true)}
                >
                  {loading ? t('common.loading') : t('seller.applyFilters', { count: String(total) })}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {saveOpen && (
        <div className="mode-onboarding-backdrop" role="dialog" aria-modal="true">
          <div className="mode-onboarding-card seller-save-modal">
            <h2 className="mode-onboarding-title">{t('savedSearch.saveTitle')}</h2>
            <label className="auth-label">{t('savedSearch.nameLabel')}</label>
            <input
              className="input mt-1 w-full"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder={t('savedSearch.namePlaceholder')}
              maxLength={80}
            />
            <ul className="seller-save-summary mt-3">
              {summarizeSellerFilters(filters, lockedCategory, t).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <label className="seller-save-default mt-3 flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={saveDefault} onChange={(e) => setSaveDefault(e.target.checked)} />
              {t('savedSearch.useAsPrimary')}
            </label>
            {saveError && <p className="auth-error mt-2" role="alert">{saveError}</p>}
            <div className="mode-onboarding-actions mt-4">
              <button type="button" className="btn btn-ghost" onClick={() => setSaveOpen(false)} disabled={saving}>
                {t('common.cancel')}
              </button>
              <button type="button" className="btn btn-primary" onClick={handleSaveSearch} disabled={saving || !saveName.trim()}>
                {saving ? t('common.saving') : t('savedSearch.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="mode-toast mode-toast--success" role="status">{toast}</div>}
    </>
  );
}
