'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getPostLoginPath } from '@/lib/auth';
import { useAuth } from '@/providers/AuthProvider';

/** Redirige usuarios autenticados fuera de rutas solo para invitados (landing, login, register). */
export function useGuestOnlyRoute(options?: { blockRedirect?: boolean }) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const blockRedirect = options?.blockRedirect ?? false;

  useEffect(() => {
    if (!loading && user && !blockRedirect) {
      router.replace(getPostLoginPath(user));
    }
  }, [user, loading, router, blockRedirect]);

  return {
    user,
    loading,
    /** Listo para mostrar contenido de invitado (sin sesión, o flujo que bloquea redirect). */
    ready: !loading && (!user || blockRedirect),
  };
}
