'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { useT } from '@/lib/i18n';
import { getToken } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading, refresh } = useAuth();
  const t = useT();

  useEffect(() => {
    if (loading) return;
    if (user) return;
    if (getToken()) {
      refresh();
      return;
    }
    router.replace('/login');
  }, [user, loading, router, refresh]);

  if (loading) {
    return (
      <>
        <Header />
        <main className="p-8">{t('common.loading')}</main>
      </>
    );
  }

  if (!user) return null;

  return children;
}
