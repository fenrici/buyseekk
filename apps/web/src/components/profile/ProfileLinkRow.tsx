'use client';

import Link from 'next/link';
import { useT } from '@/lib/i18n';

type Props = {
  label: string;
  hint?: string;
  href?: string;
  onClick?: () => void;
  comingSoon?: boolean;
  external?: boolean;
};

export function ProfileLinkRow({ label, hint, href, onClick, comingSoon, external }: Props) {
  const t = useT();
  const content = (
    <>
      <span className="profile-link-row__text">
        <span className="profile-link-row__label">{label}</span>
        {hint && <span className="profile-link-row__hint">{hint}</span>}
      </span>
      <span className="profile-link-row__meta">
        {comingSoon && <span className="profile-link-row__soon">{t('subscription.comingSoon')}</span>}
        <span className="profile-link-row__chevron" aria-hidden>
          ›
        </span>
      </span>
    </>
  );

  if (comingSoon || (!href && !onClick)) {
    return <div className="profile-link-row profile-link-row--static">{content}</div>;
  }

  if (href) {
    return (
      <Link
        href={href}
        className="profile-link-row"
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
      >
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className="profile-link-row" onClick={onClick}>
      {content}
    </button>
  );
}
