'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ImageGallery } from '@/components/ImageGallery';
import { EditRequestForm } from '@/components/EditRequestForm';
import { RequestMeta } from '@/components/RequestMeta';
import { UserRatingBadge } from '@/components/UserRatingBadge';
import { useT } from '@/lib/i18n';
import { RequestItem, User } from '@/lib/types';

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

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
  onUpdated?: () => void;
};

type Props = SellerProps | BuyerProps;

export function RequestCard(props: Props) {
  const t = useT();
  const { request, locale } = props;
  const [editing, setEditing] = useState(false);

  if (props.variant === 'seller') {
    return (
      <article className="card card-listing">
        <ImageGallery urls={request.imageUrls} alt={request.title} className="h-52" />
        <div className="flex flex-1 flex-col p-5">
          <RequestMeta request={request} locale={locale} size="sm" />
          <p className="mt-2 text-xs text-slate-400">
            {request.location}
            {request.zone ? ` · ${request.zone}` : ''}
            {' · '}
            {request.offersCount} {t('seller.offers')}
          </p>
          <div className="mt-4 flex items-center gap-3 border-t pt-4">
            <div className="avatar text-xs">{initials(request.user.name)}</div>
            <div>
              <p className="text-sm font-semibold">{request.user.name}</p>
              <UserRatingBadge stats={request.user.rating} compact />
            </div>
          </div>
          <Link href={`/requests/${request.id}`} className="btn btn-accent mt-4 w-full">
            {t('seller.sendOffer')}
          </Link>
        </div>
      </article>
    );
  }

  const hasAccepted = (request.offers ?? []).some((o) => o.status === 'ACEPTADA');

  return (
    <article className="card overflow-hidden">
      <ImageGallery urls={request.imageUrls} alt={request.title} className="h-48" />
      <div className="p-5">
        {!editing ? (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <RequestMeta request={request} locale={locale} size="sm" showRequirements />
                <p className="mt-2 text-xs text-slate-400">
                  {request.location}
                  {request.zone ? ` · ${request.zone}` : ''}
                  {' · '}
                  {request.offersCount} {t('buyer.offers')}
                  {' · '}
                  {request.pendingOffersCount} {t('buyer.pending')}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                {!hasAccepted && (
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="rounded-lg border border-indigo-200 px-3 py-1 text-sm font-semibold text-indigo-600"
                  >
                    {t('buyer.edit')}
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
