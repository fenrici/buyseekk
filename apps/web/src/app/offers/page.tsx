'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api, getToken } from '@/lib/api';
import { User } from '@/lib/types';
import { getDashboardPath } from '@/lib/auth';

export default function OffersRedirect() {
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    api<User>('/auth/me')
      .then((user) => {
        if (user.role === 'SELLER') router.replace('/seller');
        else router.replace('/buyer?tab=offers');
      })
      .catch(() => router.replace('/login'));
  }, [router]);

  return <main className="p-8 text-center text-slate-500">Redirigiendo...</main>;
}
