'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '@/lib/api';

export default function MarketplaceRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (getToken()) {
      router.replace('/seller');
    } else {
      router.replace('/login');
    }
  }, [router]);

  return <main className="p-8 text-center text-slate-500">Redirigiendo...</main>;
}
