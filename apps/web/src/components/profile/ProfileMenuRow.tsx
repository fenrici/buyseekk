'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

type Props = {
  icon: ReactNode;
  title: string;
  description: string;
  onClick?: () => void;
  href?: string;
  badge?: number;
  destructive?: boolean;
  className?: string;
};

export function ProfileMenuRow({ icon, title, description, onClick, href, badge, destructive, className }: Props) {
  const rowClass = `profile-menu-row ${destructive ? 'profile-menu-row--danger' : ''} ${className ?? ''}`.trim();
  const content = (
    <>
      <span className="profile-menu-row__icon" aria-hidden>
        {icon}
      </span>
      <span className="profile-menu-row__text">
        <span className="profile-menu-row__title">{title}</span>
        <span className="profile-menu-row__desc">{description}</span>
      </span>
      {!!badge && badge > 0 && (
        <span className="profile-menu-row__badge">{badge > 99 ? '99+' : badge}</span>
      )}
      <span className="profile-menu-row__chevron" aria-hidden>
        ›
      </span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={rowClass}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className={rowClass} onClick={onClick}>
      {content}
    </button>
  );
}
