'use client';

import { useEffect, useState } from 'react';
import {
  FREE_DAILY_OFFER_LIMIT,
  FREE_MAX_SMART_ALERTS,
  type SubscriptionPlan,
} from '@buyseekk/shared';
import { api } from '@/lib/api';
import { useT } from '@/lib/i18n';
import { planPriceLabel } from '@/lib/subscription-display';
import type { User } from '@/lib/types';
import { ProfilePlanTeaser } from './ProfilePlanTeaser';

type SavedSearch = { id: string };
type OfferItem = { createdAt: string };
type Paginated<T> = { items: T[] };

function startOfUtcDay(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function featureList(raw: string) {
  return raw.split('|').map((line) => line.trim()).filter(Boolean);
}

type Props = {
  user: User;
  isSeller: boolean;
};

export function ProfilePlanBillingScreen({ user, isSeller }: Props) {
  const t = useT();
  const plan = (user.subscriptionPlan ?? 'FREE') as SubscriptionPlan;
  const isFree = plan === 'FREE';
  const hasPlus = plan === 'PLUS' || plan === 'ENTERPRISE';

  const [offersToday, setOffersToday] = useState(0);
  const [alertCount, setAlertCount] = useState(0);
  const [usageLoading, setUsageLoading] = useState(isSeller);

  useEffect(() => {
    if (!isSeller) {
      setUsageLoading(false);
      return;
    }
    let cancelled = false;
    setUsageLoading(true);
    (async () => {
      try {
        const [searches, offersRes] = await Promise.all([
          api<SavedSearch[]>('/saved-searches').catch(() => []),
          api<Paginated<OfferItem> | OfferItem[]>('/offers/sent?limit=50').catch(() => ({ items: [] })),
        ]);
        if (cancelled) return;
        const alerts = Array.isArray(searches) ? searches.length : 0;
        const offerItems = Array.isArray(offersRes) ? offersRes : (offersRes.items ?? []);
        const dayStart = startOfUtcDay().getTime();
        setAlertCount(alerts);
        setOffersToday(offerItems.filter((o) => new Date(o.createdAt).getTime() >= dayStart).length);
      } finally {
        if (!cancelled) setUsageLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isSeller, user.id]);

  const offerLimit = hasPlus ? null : FREE_DAILY_OFFER_LIMIT;
  const alertLimit = hasPlus ? null : FREE_MAX_SMART_ALERTS;

  return (
    <div className="profile-billing">
      {isFree && <ProfilePlanTeaser plan={plan} showUpgrade={false} />}
      <section className="profile-billing__current card">
        <p className="profile-billing__eyebrow">{t('profile.billingCurrent')}</p>
        <h2 className="profile-billing__plan-name">{t(`subscription.plan.${plan}`)}</h2>
        <p className="profile-billing__price">{planPriceLabel(plan, t)}</p>
        {isSeller && (
          <div className="profile-billing__usage">
            <div className="profile-billing__usage-row">
              <span>{t('subscription.offersToday')}</span>
              <strong>{usageLoading ? '…' : offerLimit ? `${offersToday}/${offerLimit}` : t('subscription.unlimited')}</strong>
            </div>
            <div className="profile-billing__usage-row">
              <span>{t('subscription.smartAlertsLabel')}</span>
              <strong>{usageLoading ? '…' : alertLimit ? `${alertCount}/${alertLimit}` : t('subscription.unlimited')}</strong>
            </div>
          </div>
        )}
        <ul className="profile-billing__limits">
          {featureList(t(`subscription.profileFeatures.${plan}`)).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>

      {isFree && (
        <section className="profile-billing__tier card profile-billing__tier--plus">
          <div className="profile-billing__tier-head">
            <h3>{t('subscription.plan.PLUS')}</h3>
            <span>{planPriceLabel('PLUS', t)}</span>
          </div>
          <ul>
            {featureList(t('subscription.compare.PLUS')).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <button type="button" className="profile-billing__upgrade" disabled title={t('subscription.comingSoon')}>
            {t('subscription.upgradeCta')}
            <span className="profile-billing__soon">{t('subscription.comingSoon')}</span>
          </button>
        </section>
      )}

      <section className="profile-billing__tier card profile-billing__tier--enterprise">
        <div className="profile-billing__tier-head">
          <h3>{t('subscription.plan.ENTERPRISE')}</h3>
          <span>{planPriceLabel('ENTERPRISE', t)}</span>
        </div>
        <ul>
          {featureList(t('subscription.compare.ENTERPRISE')).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        {plan !== 'ENTERPRISE' && (
          <button type="button" className="profile-billing__upgrade profile-billing__upgrade--ghost" disabled>
            {t('profile.contactEnterprise')}
            <span className="profile-billing__soon">{t('subscription.comingSoon')}</span>
          </button>
        )}
      </section>
    </div>
  );
}
