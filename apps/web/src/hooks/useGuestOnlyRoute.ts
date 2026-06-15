'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getPostLoginPath } from '@/lib/auth';
import { useAuth } from '@/providers/AuthProvider';

/** Redirige usuarios autenticados fuera de rutas solo para invitados (landing, login, register). */
export function useGuestOnlyRoute() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.replace(getPostLoginPath(user));
    }
  }, [user, loading, router]);

  return {
    user,
    loading,
    /** Listo para mostrar contenido de invitado (sin sesión). */
    ready: !loading && !user,
  };
}
