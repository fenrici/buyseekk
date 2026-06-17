'use client';

import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { EmailVerificationBanner } from '@/components/EmailVerificationBanner';
import { NotificationToast } from '@/components/NotificationBell';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { PortalLoadingScreen } from '@/components/PortalLoadingScreen';
import { getToken } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import { useT } from '@/lib/i18n';

function BlockedAccountBanner({ reason }: { reason?: string | null }) {
  const t = useT();
  return (
    <div className="w-full bg-red-600 px-4 py-2.5 text-center text-sm font-semibold text-white">
      <span className="font-bold">{t('account.blockedTitle')}:</span>{' '}
      <span className="font-medium">{reason?.trim() || t('account.blockedMessage')}</span>
    </div>
  );
}

function SuspendedAccountBanner() {
  const t = useT();
  return (
    <div className="w-full bg-amber-500 px-4 py-2.5 text-center text-sm font-semibold text-slate-900">
      <span className="font-bold">{t('account.suspendedTitle')}:</span>{' '}
      <span className="font-medium">{t('account.suspendedMessage')}</span>
    </div>
  );
}

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading, refresh } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (user) {
      // Las cuentas admin no usan los paneles de comprador/vendedor.
      if (user.role === 'ADMIN') router.replace('/admin');
      return;
    }
    if (getToken()) {
      refresh();
      return;
    }
    router.replace('/login');
  }, [user, loading, router, refresh]);

  if (loading) {
    return <PortalLoadingScreen />;
  }

  if (!user) {
    if (getToken()) return <PortalLoadingScreen />;
    return null;
  }

  // Evita renderizar (y disparar fetches de) los paneles normales mientras se redirige al admin.
  if (user.role === 'ADMIN') return <PortalLoadingScreen />;

  return (
    <>
      {user.blocked && <BlockedAccountBanner reason={user.blockedReason} />}
      {!user.blocked && user.suspended && <SuspendedAccountBanner />}
      <EmailVerificationBanner placement="desktop" />
      <EmailVerificationBanner placement="mobile" />
      <NotificationToast />
      <div className="mobile-app-shell">{children}</div>
      <Suspense fallback={null}>
        <MobileBottomNav />
      </Suspense>
    </>
  );
}
