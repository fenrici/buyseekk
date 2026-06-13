'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  clearAllSellerFilters,
  clearSellerFilter,
  countActiveSellerFilters,
  EMPTY_SELLER_FILTERS,
  parseSellerFiltersJson,
  sellerFiltersEqual,
  sellerFiltersToSearchParams,
  type SellerFilterState,
} from '@buyseekk/shared';
import { api, normalizePaginated } from '@/lib/api';
import type { SavedSearchItem } from '@/lib/seller-filter-labels';
import { PaginatedResult, RequestItem } from '@/lib/types';
import { useAuth } from '@/providers/AuthProvider';

const SESSION_KEY = 'buyseekk_seller_filters';

function toEstateFilters(state: SellerFilterState) {
  return { bedrooms: state.bedrooms, minSqm: state.minSqm, maxSqm: state.maxSqm };
}

function toAutoFilters(state: SellerFilterState) {
  return {
    carBrand: state.carBrand,
    carModel: state.carModel,
    carColor: state.carColor,
    carYearMin: state.carYearMin,
    maxMileage: state.maxMileage,
  };
}

function fromParts(
  category: string,
  operation: string,
  location: string,
  zone: string,
  estate: { bedrooms: string; minSqm: string; maxSqm: string },
  auto: { carBrand: string; carModel: string; carColor: string; carYearMin: string; maxMileage: string },
): SellerFilterState {
  return { category, operation, location, zone, ...estate, ...auto };
}

export function useSellerExplore() {
  const { user } = useAuth();
  const lockedCategory = user?.sellerCategory ?? '';
  const [filters, setFilters] = useState<SellerFilterState>(EMPTY_SELLER_FILTERS);
  const [draft, setDraft] = useState<SellerFilterState>(EMPTY_SELLER_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [savedSearches, setSavedSearches] = useState<SavedSearchItem[]>([]);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [initialized, setInitialized] = useState(false);
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipPersist = useRef(true);
  const loadSeq = useRef(0);
  const lastLoadedKey = useRef('');
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const activeCount = useMemo(
    () => countActiveSellerFilters(filters, lockedCategory),
    [filters, lockedCategory],
  );

  const loadRequests = useCallback(
    async (pageNum: number, state: SellerFilterState) => {
      if (!user?.id) return;
      const key = sellerFiltersToSearchParams(state, lockedCategory, pageNum).toString();
      if (key === lastLoadedKey.current) return;
      lastLoadedKey.current = key;

      const seq = ++loadSeq.current;
      setLoading(true);
      try {
        const raw = await api<PaginatedResult<RequestItem> | RequestItem[]>(`/requests?${key}`);
        if (seq !== loadSeq.current) return;
        const reqs = normalizePaginated(raw);
        setRequests(reqs.items);
        setPage(reqs.page);
        setTotalPages(reqs.totalPages);
        setTotal(reqs.total);
        setError('');
      } catch (err) {
        if (seq !== loadSeq.current) return;
        lastLoadedKey.current = '';
        setError(err instanceof Error ? err.message : 'Error');
      } finally {
        if (seq === loadSeq.current) setLoading(false);
      }
    },
    [user?.id, lockedCategory],
  );

  const persistLastFilters = useCallback(
    (state: SellerFilterState) => {
      if (!user?.id || skipPersist.current) return;
      sessionStorage.setItem(`${SESSION_KEY}:${user.id}`, JSON.stringify(state));
      if (persistTimer.current) clearTimeout(persistTimer.current);
      persistTimer.current = setTimeout(() => {
        api('/users/me/last-search-filters', {
          method: 'PATCH',
          body: JSON.stringify({ filters: state }),
        }).catch(() => undefined);
      }, 800);
    },
    [user?.id],
  );

  const applyFilters = useCallback(
    (next: SellerFilterState, closeSheet = false) => {
      const normalized = lockedCategory ? { ...next, category: lockedCategory } : next;
      lastLoadedKey.current = '';
      setFilters(normalized);
      setDraft(normalized);
      setPage(1);
      persistLastFilters(normalized);
      if (closeSheet) setSheetOpen(false);
    },
    [lockedCategory, persistLastFilters],
  );

  const patchFilters = useCallback(
    (patch: Partial<SellerFilterState>, closeSheet = false) => {
      const next = { ...filtersRef.current, ...patch };
      if (patch.location !== undefined && patch.zone === undefined) next.zone = '';
      applyFilters(next, closeSheet);
    },
    [applyFilters],
  );

  const openSheet = useCallback(() => {
    setDraft(filters);
    setSheetOpen(true);
  }, [filters]);

  const loadSavedSearches = useCallback(async () => {
    try {
      const rows = await api<SavedSearchItem[]>('/saved-searches');
      setSavedSearches(
        rows.map((r) => ({
          ...r,
          filters: parseSellerFiltersJson(r.filters) ?? EMPTY_SELLER_FILTERS,
        })),
      );
    } catch {
      setSavedSearches([]);
    }
  }, []);

  // Inicialización: búsqueda principal → últimos filtros → sesión → vacío
  useEffect(() => {
    if (!user?.id || initialized) return;
    let cancelled = false;

    async function init() {
      const u = user;
      if (!u) return;
      skipPersist.current = true;
      let initial = clearAllSellerFilters(lockedCategory || undefined);
      try {
        const saved = await api<SavedSearchItem[]>('/saved-searches');
        if (!cancelled) {
          const parsed = saved.map((r) => ({
            ...r,
            filters: parseSellerFiltersJson(r.filters) ?? EMPTY_SELLER_FILTERS,
          }));
          setSavedSearches(parsed);
          const def = parsed.find((s) => s.isDefault);
          if (def) initial = { ...def.filters, category: lockedCategory || def.filters.category };
        }
      } catch {
        /* sin búsquedas guardadas */
      }

      if (!sellerFiltersEqual(initial, clearAllSellerFilters(lockedCategory || undefined))) {
        /* ya aplicó default */
      } else {
        const fromUser = parseSellerFiltersJson(u.lastSellerFilters);
        if (fromUser) {
          initial = lockedCategory ? { ...fromUser, category: lockedCategory } : fromUser;
        } else {
          const sess = sessionStorage.getItem(`${SESSION_KEY}:${u.id}`);
          if (sess) {
            const parsed = parseSellerFiltersJson(JSON.parse(sess));
            if (parsed) initial = lockedCategory ? { ...parsed, category: lockedCategory } : parsed;
          }
        }
      }

      if (!cancelled) {
        setFilters(initial);
        setDraft(initial);
        setInitialized(true);
        skipPersist.current = false;
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, [user?.id, lockedCategory, initialized]);

  useEffect(() => {
    if (!user?.id || !initialized) return;
    void loadRequests(page, filters);
  }, [user?.id, initialized, page, filters, loadRequests]);

  return {
    user: user!,
    lockedCategory,
    filters,
    draft,
    setDraft,
    sheetOpen,
    setSheetOpen,
    openSheet,
    applyFilters,
    patchFilters,
    clearAll: () => applyFilters(clearAllSellerFilters(lockedCategory || undefined)),
    removeChip: (key: keyof SellerFilterState) => applyFilters(clearSellerFilter(filters, key)),
    activeCount,
    savedSearches,
    reloadSaved: loadSavedSearches,
    applySaved: (item: SavedSearchItem) => applyFilters(item.filters, true),
    requests,
    page,
    setPage,
    totalPages,
    total,
    loading,
    error,
    estateFilters: toEstateFilters(filters),
    autoFilters: toAutoFilters(filters),
    draftEstate: toEstateFilters(draft),
    draftAuto: toAutoFilters(draft),
    setDraftEstate: (estate: { bedrooms: string; minSqm: string; maxSqm: string }) =>
      setDraft((d) => ({ ...d, ...estate })),
    setDraftAuto: (auto: ReturnType<typeof toAutoFilters>) =>
      setDraft((d) => ({ ...d, ...auto })),
    setDraftField: (key: keyof SellerFilterState, value: string) =>
      setDraft((d) => {
        const next = { ...d, [key]: value };
        if (key === 'location') next.zone = '';
        if (key === 'carBrand') next.carModel = '';
        return next;
      }),
  };
}

export { fromParts, toAutoFilters, toEstateFilters };
