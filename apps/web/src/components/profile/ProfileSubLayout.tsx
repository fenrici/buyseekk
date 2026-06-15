'use client';

import type { ReactNode } from 'react';
import { useT } from '@/lib/i18n';

type Props = {
  title: string;
  subtitle?: string;
  onBack: () => void;
  children: ReactNode;
  variant?: 'default' | 'wide';
};

export function ProfileSubLayout({ title, subtitle, onBack, children, variant = 'default' }: Props) {
  const t = useT();

  return (
    <div className={`profile-sub ${variant === 'wide' ? 'profile-sub--wide' : ''}`}>
      <header className="profile-sub__head">
        <button type="button" className="profile-sub__back" onClick={onBack} aria-label={t('profile.backToOverview')}>
          <span aria-hidden>←</span>
        </button>
        <div className="profile-sub__titles">
          <h1 className="profile-sub__title">{title}</h1>
          {subtitle && <p className="profile-sub__subtitle">{subtitle}</p>}
        </div>
      </header>
      <div className="profile-sub__body">{children}</div>
    </div>
  );
}
