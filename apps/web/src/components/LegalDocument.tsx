'use client';

import Link from 'next/link';
import { PublicContentShell } from '@/components/PublicContentShell';
import { type PublicRoute } from '@/components/PublicHeader';
import { getAppHomePath } from '@/lib/auth';
import { useT } from '@/lib/i18n';
import { useAuth } from '@/providers/AuthProvider';

type Section = { title: string; body: string };

type Props = {
  title: string;
  updated: string;
  sections: Section[];
  activeRoute: PublicRoute;
};

export function LegalDocument({ title, updated, sections, activeRoute }: Props) {
  const t = useT();
  const { user } = useAuth();
  const backHref = user ? getAppHomePath(user) : '/';

  return (
    <PublicContentShell activeRoute={activeRoute}>
      <Link href={backHref} className="public-content-page__back">
        ← {t('common.back')}
      </Link>
      <header className="public-content-page__header">
        <h1 className="public-content-page__title">{title}</h1>
        <p className="public-content-page__meta">{updated}</p>
      </header>
      <div className="public-content-page__sections">
        {sections.map((section) => (
          <section key={section.title} className="public-content-page__section">
            <h2>{section.title}</h2>
            <p>{section.body}</p>
          </section>
        ))}
      </div>
      <nav className="public-content-page__related" aria-label={t('footer.aria')}>
        <Link href="/help">{t('help.title')}</Link>
        <Link href="/terms">{t('profile.terms')}</Link>
        <Link href="/privacy">{t('profile.privacy')}</Link>
        <Link href="/cookies">{t('profile.cookies')}</Link>
      </nav>
    </PublicContentShell>
  );
}
