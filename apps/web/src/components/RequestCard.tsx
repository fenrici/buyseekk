'use client';

import { useState } from 'react';
import Link from 'next/link';
import { REQUEST_REMINDER_DAYS } from '@buyseekk/shared';
import { Avatar } from '@/components/Avatar';
import { EditRequestForm } from '@/components/EditRequestForm';
import { RequestMeta } from '@/components/RequestMeta';
import { RequestActivity, RequestStatusBadge } from '@/components/RequestStatusBadge';
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
  onRenew?: (id: string) => void | Promise<void>;
  onUpdated?: () => void;
};

type Props = SellerProps | BuyerProps;

const DAY_MS = 24 * 60 * 60 * 1000;

function daysIdle(lastActivityAt: string) {
  return (Date.now() - new Date(lastActivityAt).getTime()) / DAY_MS;
}

export function RequestCard(props: Props) {
  const t = useT();
  const { request, locale } = props;
  const [editing, setEditing] = useState(false);

  if (props.variant === 'seller') {
    return (
      <article className="card card-listing h-full">
        <div className="flex h-full flex-col p-5">
          <div className="mb-2">
            <RequestStatusBadge status={request.status} />
          </div>
          <RequestMeta request={request} locale={locale} size="sm" />
          <p className="mt-2 text-xs text-slate-400">
            {request.location}
            {request.zone ? ` · ${request.zone}` : ''}
          </p>
          <RequestActivity
            offersCount={request.offersCount}
            conversationsCount={request.conversationsCount}
            lastActivityAt={request.lastActivityAt}
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
            <Link href={`/requests/${request.id}`} className="btn btn-accent mt-4 w-full">
              {t('seller.sendOffer')}
            </Link>
          </div>
        </div>
      </article>
    );
  }

  const hasAccepted = (request.offers ?? []).some((o) => o.status === 'ACEPTADA');
  const isClosed = request.status === 'CERRADA';
  const isArchived = request.status === 'ARCHIVADA';
  const showReminder =
    !isClosed && !isArchived && daysIdle(request.lastActivityAt) >= REQUEST_REMINDER_DAYS;

  return (
    <article className="card">
      <div className="p-5">
        {!editing ? (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="mb-2">
                  <RequestStatusBadge status={request.status} />
                </div>
                <RequestMeta request={request} locale={locale} size="sm" showRequirements />
                <p className="mt-2 text-xs text-slate-400">
                  {request.location}
                  {request.zone ? ` · ${request.zone}` : ''}
                  {' · '}
                  {request.pendingOffersCount} {t('buyer.pending')}
                </p>
                <RequestActivity
                  offersCount={request.offersCount}
                  conversationsCount={request.conversationsCount}
                  lastActivityAt={request.lastActivityAt}
                  className="mt-1"
                />
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {!hasAccepted && !isClosed && !isArchived && (
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="rounded-lg border border-indigo-200 px-3 py-1 text-sm font-semibold text-indigo-600"
                  >
                    {t('buyer.edit')}
                  </button>
                )}
                {isArchived && props.onRenew && (
                  <button
                    type="button"
                    onClick={() => void props.onRenew?.(request.id)}
                    className="rounded-lg border border-indigo-200 px-3 py-1 text-sm font-semibold text-indigo-600"
                  >
                    {t('reminder.keep')}
                  </button>
                )}
                {!isClosed && props.onClose && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(t('buyer.closeConfirm'))) {
                        void props.onClose?.(request.id);
                      }
                    }}
                    className="rounded-lg border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-500"
                  >
                    {t('buyer.closeAction')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(t('buyer.deleteConfirm'))) {
                      void props.onDelete(request.id);
                    }
                  }}
                  className="rounded-lg border border-red-200 px-3 py-1 text-sm font-semibold text-red-600"
                >
                  {t('buyer.delete')}
                </button>
              </div>
            </div>
            {showReminder && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-bold text-amber-700">{t('reminder.title')}</p>
                <p className="mt-0.5 text-xs text-amber-700/80">{t('reminder.hint')}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void props.onRenew?.(request.id)}
                    className="btn btn-primary px-3 py-1.5 text-sm"
                  >
                    {t('reminder.keep')}
                  </button>
                  <button
                    type="button"
                    onClick={() => void props.onClose?.(request.id)}
                    className="btn btn-ghost border px-3 py-1.5 text-sm"
                  >
                    {t('reminder.close')}
                  </button>
                </div>
              </div>
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
