'use client';

import Link from 'next/link';
import { getAppHomePath } from '@/lib/auth';
import { useT } from '@/lib/i18n';
import { useAuth } from '@/providers/AuthProvider';

type Section = { title: string; body: string };

type Props = {
  title: string;
  updated: string;
  sections: Section[];
};

export function LegalDocument({ title, updated, sections }: Props) {
  const t = useT();
  const { user } = useAuth();
  const backHref = user ? getAppHomePath(user) : '/';

  return (
    <main className="legal-page">
      <div className="legal-page__inner">
        <Link href={backHref} className="legal-page__back">
          ← {t('common.back')}
        </Link>
        <h1 className="legal-page__title">{title}</h1>
        <p className="legal-page__updated">{updated}</p>
        {sections.map((section) => (
          <section key={section.title} className="legal-page__section">
            <h2>{section.title}</h2>
            <p>{section.body}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
