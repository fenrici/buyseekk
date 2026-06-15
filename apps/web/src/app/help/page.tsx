'use client';

import Link from 'next/link';
import { PublicContentShell } from '@/components/PublicContentShell';
import { useT } from '@/lib/i18n';

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? 'support@buyseekk.com';

export default function HelpPage() {
  const t = useT();
  const faq = [
    { q: t('help.faq1q'), a: t('help.faq1a') },
    { q: t('help.faq2q'), a: t('help.faq2a') },
    { q: t('help.faq3q'), a: t('help.faq3a') },
    { q: t('help.faq4q'), a: t('help.faq4a') },
    { q: t('help.faq5q'), a: t('help.faq5a') },
  ];

  return (
    <PublicContentShell activeRoute="/help">
      <header className="public-content-page__header">
        <h1 className="public-content-page__title">{t('help.title')}</h1>
        <p className="public-content-page__meta">{t('help.intro')}</p>
      </header>

      <div className="help-page__actions">
        <a href={`mailto:${SUPPORT_EMAIL}`} className="help-page__action">
          {t('help.contact')}
        </a>
        <a
          href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(t('help.reportSubject'))}`}
          className="help-page__action help-page__action--ghost"
        >
          {t('help.report')}
        </a>
        <a
          href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(t('help.feedbackSubject'))}`}
          className="help-page__action help-page__action--ghost"
        >
          {t('help.feedback')}
        </a>
      </div>

      <p className="help-page__support-email">
        <span className="help-page__support-label">{t('help.supportEmailLabel')}</span>
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
      </p>

      <h2 className="help-page__faq-title">{t('help.faqTitle')}</h2>
      <div className="help-page__faq">
        {faq.map((item) => (
          <details key={item.q} className="help-page__faq-item">
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </details>
        ))}
      </div>

      <nav className="public-content-page__related" aria-label={t('footer.aria')}>
        <Link href="/terms">{t('profile.terms')}</Link>
        <Link href="/privacy">{t('profile.privacy')}</Link>
        <Link href="/cookies">{t('profile.cookies')}</Link>
      </nav>
    </PublicContentShell>
  );
}
