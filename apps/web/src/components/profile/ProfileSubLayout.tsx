'use client';

import type { ReactNode } from 'react';
import { useT } from '@/lib/i18n';

type Props = {
  title: string;
  onBack: () => void;
  children: ReactNode;
};

export function ProfileSubLayout({ title, onBack, children }: Props) {
  const t = useT();

  return (
    <div className="profile-sub">
      <header className="profile-sub__head">
        <button type="button" className="profile-sub__back" onClick={onBack} aria-label={t('profile.backToOverview')}>
          <span aria-hidden>←</span>
        </button>
        <h1 className="profile-sub__title">{title}</h1>
      </header>
      <div className="profile-sub__body">{children}</div>
    </div>
  );
}
