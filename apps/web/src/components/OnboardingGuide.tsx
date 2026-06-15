'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useT } from '@/lib/i18n';

type Props = {
  mode: 'BUYER' | 'SELLER';
};

function storageKey(mode: 'BUYER' | 'SELLER') {
  return `buyseekk_onboarding_${mode.toLowerCase()}`;
}

export function OnboardingGuide({ mode }: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem(storageKey(mode))) setOpen(true);
  }, [mode]);

  if (!open) return null;

  const steps =
    mode === 'BUYER'
      ? [
          { title: t('onboarding.buyer1Title'), body: t('onboarding.buyer1Body') },
          { title: t('onboarding.buyer2Title'), body: t('onboarding.buyer2Body') },
          { title: t('onboarding.buyer3Title'), body: t('onboarding.buyer3Body') },
        ]
      : [
          { title: t('onboarding.seller1Title'), body: t('onboarding.seller1Body') },
          { title: t('onboarding.seller2Title'), body: t('onboarding.seller2Body') },
          { title: t('onboarding.seller3Title'), body: t('onboarding.seller3Body') },
        ];

  function dismiss() {
    localStorage.setItem(storageKey(mode), '1');
    setOpen(false);
  }

  return (
    <div className="onboarding-guide" role="dialog" aria-labelledby="onboarding-title">
      <div className="onboarding-guide__card">
        <h2 id="onboarding-title" className="onboarding-guide__title">
          {mode === 'BUYER' ? t('onboarding.buyerTitle') : t('onboarding.sellerTitle')}
        </h2>
        <ol className="onboarding-guide__steps">
          {steps.map((step) => (
            <li key={step.title}>
              <strong>{step.title}</strong>
              <span>{step.body}</span>
            </li>
          ))}
        </ol>
        <div className="onboarding-guide__actions">
          <button type="button" className="btn btn-primary" onClick={dismiss}>
            {t('onboarding.gotIt')}
          </button>
          <Link href="/help" className="onboarding-guide__help" onClick={dismiss}>
            {t('help.title')}
          </Link>
        </div>
      </div>
    </div>
  );
}
