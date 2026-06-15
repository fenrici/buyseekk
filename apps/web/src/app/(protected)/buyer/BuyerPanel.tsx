'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, normalizePaginated } from '@/lib/api';
import { PaginatedResult, RequestItem } from '@/lib/types';
import { BuyerPanelTabs } from '@/components/BuyerPanelTabs';
import { Header } from '@/components/Header';
import { PanelListLoading } from '@/components/PanelListLoading';
import { PaginationControls } from '@/components/PaginationControls';
import { CreateRequestForm } from '@/components/CreateRequestForm';
import { RequestCard } from '@/components/RequestCard';
import { OnboardingGuide } from '@/components/OnboardingGuide';
import { RequestConfirmationModal } from '@/components/RequestConfirmationModal';
import { useAuth } from '@/providers/AuthProvider';
import { useT } from '@/lib/i18n';

type Tab = 'publish' | 'mine';
type MineScope = 'open' | 'closed' | 'archived';

export function BuyerPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const t = useT();
  const [tab, setTab] = useState<Tab>('publish');
  const [myRequests, setMyRequests] = useState<RequestItem[]>([]);
  const [minePage, setMinePage] = useState(1);
  const [mineScope, setMineScope] = useState<MineScope>('open');
  const [mineMeta, setMineMeta] = useState({ total: 0, totalPages: 1, page: 1 });
  const [error, setError] = useState('');
  const [mineLoading, setMineLoading] = useState(false);
  const [pendingQueue, setPendingQueue] = useState<RequestItem[]>([]);
  const [modalBusy, setModalBusy] = useState(false);

  async function loadPendingConfirmations() {
    const raw = await api<PaginatedResult<RequestItem> | RequestItem[]>(
      '/requests/mine?page=1&limit=50&scope=open',
    );
    const data = normalizePaginated(raw);
    setPendingQueue(data.items.filter((r) => r.status === 'PENDIENTE_DE_CONFIRMACION'));
  }

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'offers') {
      router.replace('/buyer/offers');
      return;
    }
    if (tabParam === 'publish' || tabParam === 'mine') setTab(tabParam);
  }, [searchParams, router]);

  useEffect(() => {
    if (!user) return;
    loadPendingConfirmations().catch(() => {});
  }, [user]);

  async function loadMine(page = minePage, scope = mineScope) {
    const raw = await api<PaginatedResult<RequestItem> | RequestItem[]>(
      `/requests/mine?page=${page}&scope=${scope}`,
    );
    const data = normalizePaginated(raw);
    setMyRequests(data.items);
    setMineMeta({ total: data.total, totalPages: data.totalPages, page: data.page });
    setMinePage(data.page);
    if (scope === 'open') {
      setPendingQueue(data.items.filter((r) => r.status === 'PENDIENTE_DE_CONFIRMACION'));
    }
  }

  useEffect(() => {
    if (!user || tab !== 'mine') return;
    let cancelled = false;
    setError('');
    setMineLoading(true);
    loadMine(minePage, mineScope)
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : t('common.error'));
      })
      .finally(() => {
        if (!cancelled) setMineLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, user, minePage, mineScope]);

  function changeScope(scope: MineScope) {
    setMineScope(scope);
    setMinePage(1);
  }

  async function removeRequest(id: string) {
    try {
      await api(`/requests/${id}`, { method: 'DELETE' });
      await loadMine(minePage);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
    }
  }

  async function closeRequest(id: string) {
    try {
      await api(`/requests/${id}/close`, { method: 'PATCH' });
      await loadMine(minePage);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
    }
  }

  async function closeDeal(id: string) {
    try {
      await api(`/requests/${id}/close`, { method: 'PATCH' });
      router.push('/ratings');
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
    }
  }

  async function archiveRequest(id: string) {
    try {
      await api(`/requests/${id}/pause`, { method: 'PATCH' });
      await loadMine(minePage, mineScope);
      await loadPendingConfirmations();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
    }
  }

  async function renewRequest(id: string) {
    try {
      await api(`/requests/${id}/renew`, { method: 'PATCH' });
      await loadMine(minePage);
      await loadPendingConfirmations();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
    }
  }

  async function handleModalAction(
    id: string,
    action: 'keep' | 'bought' | 'pause' | 'delete',
  ) {
    setModalBusy(true);
    setError('');
    try {
      if (action === 'keep') await api(`/requests/${id}/renew`, { method: 'PATCH' });
      else if (action === 'bought') await api(`/requests/${id}/close`, { method: 'PATCH' });
      else if (action === 'pause') await api(`/requests/${id}/pause`, { method: 'PATCH' });
      else await api(`/requests/${id}`, { method: 'DELETE' });
      await loadMine(minePage, mineScope);
      await loadPendingConfirmations();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setModalBusy(false);
    }
  }

  const pendingRequest = pendingQueue[0];

  if (!user) return null;

  return (
    <div className="panel-dark">
      <OnboardingGuide mode="BUYER" />
      {pendingRequest && (
        <RequestConfirmationModal
          request={pendingRequest}
          locale={user.locale}
          busy={modalBusy}
          onKeep={() => handleModalAction(pendingRequest.id, 'keep')}
          onBought={() => handleModalAction(pendingRequest.id, 'bought')}
          onPause={() => handleModalAction(pendingRequest.id, 'pause')}
          onDelete={() => handleModalAction(pendingRequest.id, 'delete')}
        />
      )}
      <Header variant="dark" />
      <main className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-3xl font-bold text-white">{t('buyer.title')}</h1>
        <p className="mt-1 text-slate-500">{t('buyer.requestsSubtitle')}</p>

        <BuyerPanelTabs activeTab={tab} onTabChange={setTab} />

        {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}

        {tab === 'publish' && (
          <div className="mt-8">
            <CreateRequestForm
              user={user}
              onSuccess={() => {
                setTab('mine');
                setMinePage(1);
                loadMine(1);
              }}
            />
          </div>
        )}

        {tab === 'mine' && (
          <div className="mt-8 space-y-4">
            <div className="flex flex-wrap gap-2" role="group" aria-label={t('buyer.tabMine')}>
              {(['open', 'closed', 'archived'] as const).map((scope) => (
                <button
                  key={scope}
                  type="button"
                  onClick={() => changeScope(scope)}
                  aria-pressed={mineScope === scope}
                  className={`explore-pill ${mineScope === scope ? 'active' : ''}`}
                >
                  {t(`buyer.scope${scope === 'open' ? 'Open' : scope === 'closed' ? 'Closed' : 'Archived'}`)}
                </button>
              ))}
            </div>
            <PanelListLoading loading={mineLoading} />
            {!mineLoading && myRequests.length === 0 && (
              <p className="text-slate-500">{t('buyer.noRequests')}</p>
            )}
            {!mineLoading && myRequests.map((r) => (
              <RequestCard
                key={r.id}
                variant="buyer"
                request={r}
                locale={user.locale}
                onDelete={removeRequest}
                onClose={closeRequest}
                onCloseDeal={closeDeal}
                onArchive={archiveRequest}
                onRenew={renewRequest}
                onUpdated={() => loadMine(minePage)}
              />
            ))}
            {!mineLoading && (
              <PaginationControls
                page={mineMeta.page}
                totalPages={mineMeta.totalPages}
                total={mineMeta.total}
                onPageChange={setMinePage}
                itemLabel={t('buyer.tabMine').toLowerCase()}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
