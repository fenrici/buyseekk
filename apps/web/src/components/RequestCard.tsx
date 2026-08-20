'use client';

import { useState } from 'react';
import Link from 'next/link';
import { requestHasActiveNegotiation } from '@buyseekk/shared';
import { Avatar } from '@/components/Avatar';
import { EditRequestForm } from '@/components/EditRequestForm';
import { RequestMeta } from '@/components/RequestMeta';
import { RequestLocationText } from '@/components/RequestLocationText';
import { SellerMarketplaceRequestCard } from '@/components/SellerMarketplaceRequestCard';
import { RequestActivity, RequestStatusBadge } from '@/components/RequestStatusBadge';
import { SaveRequestButton, canSellerOfferOnRequest } from '@/components/SaveRequestButton';
import { UserRatingBadge } from '@/components/UserRatingBadge';
import { useT } from '@/lib/i18n';
import { RequestItem, User } from '@/lib/types';

type SellerProps = {
  variant: 'seller';
  request: RequestItem;
  locale: User['locale'];
};

type BuyerProps = {
  variant: 'buyer';
  request: RequestItem;
  locale: User['locale'];
  onDelete: (id: string) => void | Promise<void>;
  onClose?: (id: string) => void | Promise<void>;
  onArchive?: (id: string) => void | Promise<void>;
  onRenew?: (id: string) => void | Promise<void>;
  onUpdated?: () => void;
};

type Props = SellerProps | BuyerProps;

export function RequestCard(props: Props) {
  const t = useT();
  const { request, locale } = props;
  const [editing, setEditing] = useState(false);

  if (props.variant === 'seller') {
    return (
      <article className="card card-listing h-full">
        <div className="relative flex h-full flex-col p-5">
          <div className="absolute right-3 top-3 z-10">
            <SaveRequestButton requestId={request.id} initialSaved={request.isSaved} />
          </div>
          <SellerMarketplaceRequestCard request={request} locale={locale} className="pr-8" />
          <RequestActivity
            offersCount={request.offersCount}
            conversationsCount={request.conversationsCount}
            lastBuyerActivityAt={request.lastBuyerActivityAt ?? request.lastActivityAt}
            createdAt={request.createdAt}
            showPublished
            className="mt-1"
          />
          <div className="mt-auto pt-4">
            <div className="flex items-center gap-3 border-t pt-4">
              <Link href={`/users/${request.user.id}`} className="shrink-0">
                <Avatar name={request.user.name} url={request.user.avatarUrl} size={36} />
              </Link>
              <div>
                <Link href={`/users/${request.user.id}`} className="text-sm font-semibold hover:underline">
                  {request.user.name}
                </Link>
                <UserRatingBadge stats={request.user.rating} compact />
              </div>
            </div>
            {canSellerOfferOnRequest(request.status, request.myOffer) ? (
              <Link href={`/requests/${request.id}`} className="btn btn-accent mt-4 w-full">
                {t('seller.sendOffer')}
              </Link>
            ) : (
              <Link href={`/requests/${request.id}`} className="btn btn-ghost mt-4 w-full border">
                {t('savedRequest.viewDetail')}
              </Link>
            )}
          </div>
        </div>
      </article>
    );
  }

  const hasActiveNegotiation = requestHasActiveNegotiation(request.offers);
  const isClosed = request.status === 'CERRADA';
  const isArchived = request.status === 'ARCHIVADA';
  const isPaused = request.status === 'PAUSADA';
  const isPending = request.status === 'PENDIENTE_DE_CONFIRMACION';
  const isInactive = request.status === 'INACTIVA';
  const isNegotiating = request.status === 'NEGOCIANDO';
  const canEdit = !hasActiveNegotiation && !isClosed && !isArchived && !isNegotiating && !isPaused;
  const showDealFailedAction =
    (isNegotiating || (isPaused && hasActiveNegotiation)) && !!props.onClose;
  const canPause = !isClosed && !isArchived && !isPaused;
  const canRenew = isPaused || isArchived || isInactive;

  const actionBtn =
    'shrink-0 whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-semibold sm:text-sm';

  return (
    <article className="card">
      <div className="p-4 sm:p-5">
        {!editing ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <RequestStatusBadge status={request.status} />
              <span className="shrink-0 text-xs font-semibold text-slate-400">
                {request.pendingOffersCount} {t('buyer.pending')}
              </span>
            </div>

            <div className="mt-2 min-w-0">
              <RequestMeta
                request={request}
                locale={locale}
                size="sm"
                compact
                showRequirements={false}
              />
              <RequestLocationText
                className="mt-1.5 truncate text-xs text-slate-400"
                location={request.location}
                zone={request.zone}
                country={request.country}
                locale={locale}
              />
              <RequestActivity
                offersCount={request.offersCount}
                conversationsCount={request.conversationsCount}
                lastBuyerActivityAt={request.lastBuyerActivityAt ?? request.lastActivityAt}
                createdAt={request.createdAt}
                className="mt-1 truncate"
              />
            </div>

            <div className="mt-3 flex gap-2 overflow-x-auto border-t border-white/10 pt-3 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden">
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className={`${actionBtn} border-indigo-200 text-indigo-600`}
                >
                  {t('buyer.edit')}
                </button>
              )}
              {canRenew && props.onRenew && (
                <button
                  type="button"
                  onClick={() => void props.onRenew?.(request.id)}
                  className={`${actionBtn} border-indigo-200 text-indigo-600`}
                >
                  {isPaused ? t('buyer.reactivateAction') : t('reminder.keep')}
                </button>
              )}
              {canPause && props.onArchive && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(t('buyer.archiveConfirm'))) {
                      void props.onArchive?.(request.id);
                    }
                  }}
                  className={`${actionBtn} border-amber-200 text-amber-700`}
                >
                  {t('buyer.archiveAction')}
                </button>
              )}
              {showDealFailedAction && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(t('buyer.dealFailedConfirm'))) {
                      void props.onClose?.(request.id);
                    }
                  }}
                  className={`${actionBtn} border-amber-200 text-amber-700`}
                >
                  {t('buyer.dealFailedAction')}
                </button>
              )}
              {!isClosed && !showDealFailedAction && props.onClose && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(t('buyer.closeConfirm'))) {
                      void props.onClose?.(request.id);
                    }
                  }}
                  className={`${actionBtn} border-slate-200 text-slate-500`}
                >
                  {t('buyer.closeAction')}
                </button>
              )}
              {!isNegotiating && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(t('buyer.deleteConfirm'))) {
                      void props.onDelete(request.id);
                    }
                  }}
                  className={`${actionBtn} border-red-200 text-red-600`}
                >
                  {t('buyer.delete')}
                </button>
              )}
            </div>

            {isPending && (
              <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                {t('reminder.hint')}
              </p>
            )}
          </>
        ) : (
          <EditRequestForm
            request={request}
            onSuccess={() => {
              setEditing(false);
              props.onUpdated?.();
            }}
            onCancel={() => setEditing(false)}
          />
        )}
      </div>
    </article>
  );
}
