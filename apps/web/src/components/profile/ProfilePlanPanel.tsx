'use client';

import { useEffect, useState } from 'react';
import {
  FREE_DAILY_OFFER_LIMIT,
  FREE_MAX_SMART_ALERTS,
  SUBSCRIPTION_PLANS,
  type SubscriptionPlan,
} from '@buyseekk/shared';
import { api } from '@/lib/api';
import { useT } from '@/lib/i18n';
import { planPriceLabel } from '@/lib/subscription-display';
import type { User } from '@/lib/types';

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

export function ProfilePlanPanel({ user, isSeller }: Props) {
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
        const todayCount = offerItems.filter((o) => new Date(o.createdAt).getTime() >= dayStart).length;

        setAlertCount(alerts);
        setOffersToday(todayCount);
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
  const offerPct = offerLimit ? Math.min(100, (offersToday / offerLimit) * 100) : 0;
  const alertPct = alertLimit ? Math.min(100, (alertCount / alertLimit) * 100) : 0;

  return (
    <div className="profile-sidebar-stack">
      {isFree && (
        <section className="profile-upgrade card" aria-labelledby="profile-upgrade-title">
          <div className="profile-upgrade__glow" aria-hidden />
          <p className="profile-upgrade__eyebrow">Buyseek Plus · {planPriceLabel('PLUS', t)}</p>
          <h2 id="profile-upgrade-title" className="profile-upgrade__title">
            {t('subscription.upgradeTitle')}
          </h2>
          <p className="profile-upgrade__text">{t('subscription.upgradeText')}</p>
          <ul className="profile-upgrade__benefits">
            <li>{t('subscription.upgradeBenefit1')}</li>
            <li>{t('subscription.upgradeBenefit2')}</li>
            <li>{t('subscription.upgradeBenefit3')}</li>
          </ul>
          <button type="button" className="profile-upgrade__cta" disabled title={t('subscription.comingSoon')}>
            {t('subscription.upgradeCta')} · {planPriceLabel('PLUS', t)}
            <span className="profile-upgrade__soon">{t('subscription.comingSoon')}</span>
          </button>
        </section>
      )}

      <section className="profile-plan-card card" aria-labelledby="profile-plan-title">
        <div className="profile-plan-card__head">
          <h2 id="profile-plan-title" className="profile-plan-card__title">
            {t('profile.planTitle')}
          </h2>
          <span className={`profile-plan-pill profile-plan-pill--${plan.toLowerCase()}`}>
            {t(`subscription.plan.${plan}`)}
          </span>
        </div>
        <p className="profile-plan-card__price">{planPriceLabel(plan, t)}</p>
        <p className="profile-plan-card__tagline">{t(`subscription.tagline.${plan}`)}</p>

        <ul className="profile-plan-card__features">
          {featureList(t(`subscription.profileFeatures.${plan}`)).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>

        {isSeller && (
          <div className="profile-usage">
            <div className="profile-usage__row">
              <div className="profile-usage__label">
                <span>{t('subscription.offersToday')}</span>
                <strong>
                  {usageLoading
                    ? '…'
                    : offerLimit
                      ? `${offersToday}/${offerLimit}`
                      : t('subscription.unlimited')}
                </strong>
              </div>
              {offerLimit != null && (
                <div className="profile-usage__bar" role="presentation">
                  <span className="profile-usage__fill" style={{ width: `${offerPct}%` }} />
                </div>
              )}
            </div>
            <div className="profile-usage__row">
              <div className="profile-usage__label">
                <span>{t('subscription.smartAlertsLabel')}</span>
                <strong>
                  {usageLoading
                    ? '…'
                    : alertLimit
                      ? `${alertCount}/${alertLimit}`
                      : t('subscription.unlimited')}
                </strong>
              </div>
              {alertLimit != null && (
                <div className="profile-usage__bar" role="presentation">
                  <span className="profile-usage__fill profile-usage__fill--alt" style={{ width: `${alertPct}%` }} />
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="profile-compare card" aria-labelledby="profile-compare-title">
        <h2 id="profile-compare-title" className="profile-compare__title">
          {t('subscription.compareTitle')}
        </h2>
        <div className="profile-compare__grid">
          {SUBSCRIPTION_PLANS.map((tier) => {
            const active = tier === plan;
            return (
              <article
                key={tier}
                className={`profile-compare-card ${active ? 'profile-compare-card--active' : ''}`}
              >
                <h3 className="profile-compare-card__name">{t(`subscription.plan.${tier}`)}</h3>
                <p className="profile-compare-card__price">{planPriceLabel(tier, t)}</p>
                <ul>
                  {featureList(t(`subscription.compare.${tier}`)).map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                {active && <span className="profile-compare-card__current">{t('subscription.currentPlan')}</span>}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
