'use client';

import Link from 'next/link';
import { useT } from '@/lib/i18n';
import { useAuth } from '@/providers/AuthProvider';

type Props = {
  title?: string;
  text?: string;
  className?: string;
};

/** Bloque de conversión para invitados: invita a crear cuenta o iniciar sesión. */
export function GuestCta({ title, text, className = '' }: Props) {
  const t = useT();
  const { user, loading } = useAuth();

  if (loading || user) return null;

  return (
    <div className={`guest-cta ${className}`}>
      <p className="guest-cta__title">{title ?? t('guest.ctaTitle')}</p>
      <p className="guest-cta__text">{text ?? t('guest.ctaText')}</p>
      <div className="guest-cta__actions">
        <Link href="/register" className="portal-cta portal-cta-primary">
          {t('guest.register')}
        </Link>
        <Link href="/login" className="portal-cta portal-cta-secondary">
          {t('guest.login')}
        </Link>
      </div>
    </div>
  );
}
