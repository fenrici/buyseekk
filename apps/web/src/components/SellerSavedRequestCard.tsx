'use client';

import Link from 'next/link';
import { Avatar } from '@/components/Avatar';
import { RequestMeta } from '@/components/RequestMeta';
import { RequestActivity, RequestStatusBadge } from '@/components/RequestStatusBadge';
import { SaveRequestButton, canSellerOfferOnRequest } from '@/components/SaveRequestButton';
import { UserRatingBadge } from '@/components/UserRatingBadge';
import { useT } from '@/lib/i18n';
import { RequestItem, User } from '@/lib/types';

type Props = {
  request: RequestItem;
  locale: User['locale'];
  onUnsaved?: (id: string) => void;
};

export function SellerSavedRequestCard({ request, locale, onUnsaved }: Props) {
  const t = useT();
  const canOffer = canSellerOfferOnRequest(request.status, request.myOffer);

  return (
    <article className="card card-listing h-full">
      <div className="relative flex h-full flex-col p-5">
        <div className="absolute right-3 top-3 z-10">
          <SaveRequestButton
            requestId={request.id}
            initialSaved
            onChange={(saved) => {
              if (!saved) onUnsaved?.(request.id);
            }}
          />
        </div>

        <div className="mb-2 pr-10">
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
          lastBuyerActivityAt={request.lastBuyerActivityAt ?? request.lastActivityAt}
          createdAt={request.createdAt}
          showPublished
          className="mt-1"
        />

        {request.myOffer && (
          <p className="mt-2 text-xs font-semibold text-indigo-300">{t('savedRequest.alreadyOffered')}</p>
        )}

        <div className="mt-auto">
          <div className="mt-4 flex items-center gap-3 border-t border-white/10 pt-4">
            <Link href={`/users/${request.user.id}`} className="shrink-0">
              <Avatar name={request.user.name} url={request.user.avatarUrl} size={36} />
            </Link>
            <div className="min-w-0">
              <Link href={`/users/${request.user.id}`} className="text-sm font-semibold hover:underline">
                {request.user.name}
              </Link>
              <UserRatingBadge stats={request.user.rating} compact />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={`/requests/${request.id}`} className="btn btn-ghost border text-sm">
              {t('savedRequest.viewDetail')}
            </Link>
            {canOffer && (
              <Link href={`/requests/${request.id}`} className="btn btn-accent text-sm">
                {t('seller.sendOffer')}
              </Link>
            )}
            {request.myOffer?.chatId && (
              <Link href={`/chats/${request.myOffer.chatId}`} className="btn btn-ghost border text-sm">
                {t('savedRequest.viewChat')}
              </Link>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
