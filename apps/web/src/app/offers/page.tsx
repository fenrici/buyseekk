'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api, getToken } from '@/lib/api';
import { User } from '@/lib/types';
import { PortalLoadingScreen } from '@/components/PortalLoadingScreen';
import { useT } from '@/lib/i18n';

export default function OffersRedirect() {
  const router = useRouter();
  const t = useT();

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    api<User>('/auth/me')
      .then((user) => {
        if (user.role === 'SELLER') router.replace('/seller');
        else router.replace('/buyer/offers');
      })
      .catch(() => router.replace('/login'));
  }, [router]);

  return <PortalLoadingScreen label={t('common.redirecting')} />;
}
