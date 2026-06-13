'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { PublicRequestItem } from '@/lib/types';
import { PublicHeader } from '@/components/PublicHeader';
import { RequestMeta } from '@/components/RequestMeta';
import { ImageGallery } from '@/components/ImageGallery';
import { GuestCta } from '@/components/GuestCta';
import { RequestStatusBadge } from '@/components/RequestStatusBadge';
import { PortalLoadingScreen } from '@/components/PortalLoadingScreen';
import { timeAgo, useLocale, useT } from '@/lib/i18n';

export default function PublicRequestDetailPage() {
  const t = useT();
  const locale = useLocale();
  const { id } = useParams<{ id: string }>();
  const [request, setRequest] = useState<PublicRequestItem | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api<PublicRequestItem>(`/public/requests/${id}`)
      .then((data) => {
        if (!cancelled) setRequest(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : t('common.error'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) return <PortalLoadingScreen />;

  return (
    <div className="panel-dark">
      <PublicHeader activeRoute="/marketplace" />

      <main className="mx-auto max-w-3xl px-4 pb-16 pt-10 lg:pt-14">
        <Link href="/marketplace" className="portal-header-link inline-flex">
          ← {t('guest.back')}
        </Link>

        {error && (
          <p className="mt-6 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>
        )}

        {request && (
          <div className="mt-5">
            {(request.imageUrls?.length ?? 0) > 0 && (
              <div className="mb-5">
                <ImageGallery urls={request.imageUrls} alt={request.title} className="h-64 md:h-80" />
              </div>
            )}

            {request.status === 'NEGOCIANDO' && (
              <div className="mb-2">
                <RequestStatusBadge status="NEGOCIANDO" />
              </div>
            )}

            <RequestMeta request={request} locale={locale} size="md" />

            <p className="mt-3 text-sm text-slate-400">
              {request.location}
              {request.zone ? ` · ${request.zone}` : ''}
              {' · '}
              {timeAgo(locale, request.lastActivityAt ?? request.createdAt)}
            </p>

            <div className="mt-3 flex items-center gap-2.5">
              <div className="avatar text-xs">{request.buyerInitials}</div>
              <p className="text-sm font-semibold text-slate-200">{t('explore.buyer')}</p>
              <span className="explore-offers-chip ml-auto">
                {request.offersCount} {t('explore.offers')}
              </span>
            </div>

            <GuestCta className="mt-8" title={t('guest.offerCta')} />
          </div>
        )}
      </main>
    </div>
  );
}
