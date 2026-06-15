'use client';

import type { ReactNode } from 'react';

type Props = {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  destructive?: boolean;
  className?: string;
};

export function ProfileMenuRow({ icon, title, description, onClick, destructive, className }: Props) {
  return (
    <button
      type="button"
      className={`profile-menu-row ${destructive ? 'profile-menu-row--danger' : ''} ${className ?? ''}`.trim()}
      onClick={onClick}
    >
      <span className="profile-menu-row__icon" aria-hidden>
        {icon}
      </span>
      <span className="profile-menu-row__text">
        <span className="profile-menu-row__title">{title}</span>
        <span className="profile-menu-row__desc">{description}</span>
      </span>
      <span className="profile-menu-row__chevron" aria-hidden>
        ›
      </span>
    </button>
  );
}
