'use client';

import type { ReactNode } from 'react';

type Props = {
  id?: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function ProfileSection({ id, title, description, children, className = '' }: Props) {
  return (
    <section id={id} className={`profile-section card ${className}`.trim()}>
      <header className="profile-section__head">
        <h2 className="profile-section__title">{title}</h2>
        {description && <p className="profile-section__desc">{description}</p>}
      </header>
      <div className="profile-section__body">{children}</div>
    </section>
  );
}
