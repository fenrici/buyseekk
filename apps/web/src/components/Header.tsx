'use client';

import Link from 'next/link';
import { clearToken } from '@/lib/api';
import { useUser } from '@/hooks/useUser';
import { isBuyerRole, isSellerRole } from '@/lib/auth';

export function Header() {
  const { user, loading } = useUser();

  return (
    <header className="sticky top-0 z-50 border-b border-transparent bg-white/85 backdrop-blur-md transition-shadow">
      <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5 text-xl font-extrabold text-[var(--dark)]">
          <span className="text-[var(--primary)]">⇄</span> BuySeek
        </Link>

        <nav className="hidden gap-7 text-sm font-medium text-[var(--text-muted)] md:flex">
          {!loading && user && isBuyerRole(user.role) && (
            <Link href="/buyer" className="transition hover:text-[var(--primary)]">Mi panel</Link>
          )}
          {!loading && user && isSellerRole(user.role) && (
            <Link href="/seller" className="transition hover:text-[var(--primary)]">Panel vendedor</Link>
          )}
          {!loading && user && (
            <Link href="/chats" className="transition hover:text-[var(--primary)]">Mensajes</Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {!loading && user ? (
            <>
              <span className="hidden text-sm text-[var(--text-muted)] sm:inline">{user.name}</span>
              {user.role === 'BOTH' && (
                <div className="hidden gap-1 sm:flex">
                  <Link href="/buyer" className="btn btn-ghost px-2 py-1 text-xs">Comprador</Link>
                  <Link href="/seller" className="btn btn-ghost px-2 py-1 text-xs">Vendedor</Link>
                </div>
              )}
              <button onClick={() => { clearToken(); window.location.href = '/'; }} className="btn btn-ghost px-3 py-2 text-sm">
                Salir
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost px-3 py-2 text-sm">Entrar</Link>
              <Link href="/register" className="btn btn-primary px-3 py-2 text-sm">Registrarse</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
