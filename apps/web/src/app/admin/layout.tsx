'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { getToken } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';

const NAV = [
  { href: '/admin', label: 'Overview', exact: true },
  { href: '/admin/users', label: 'Usuarios' },
  { href: '/admin/requests', label: 'Solicitudes' },
  { href: '/admin/offers', label: 'Ofertas' },
  { href: '/admin/chats', label: 'Chats' },
  { href: '/admin/reports', label: 'Reportes' },
  { href: '/admin/moderation', label: 'Moderación' },
  { href: '/admin/security-logs', label: 'Seguridad' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, refresh } = useAuth();

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
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        Cargando…
      </div>
    );
  }

  if (!user) return null;

  if (user.role !== 'ADMIN') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 px-6 text-center text-slate-200">
        <p className="text-5xl font-black text-slate-700">403</p>
        <p className="max-w-sm text-sm text-slate-400">
          Acceso restringido. No tenés permisos de administrador para ver esta sección.
        </p>
        <Link href="/" className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900">
          Volver al inicio
        </Link>
      </div>
    );
  }

  const isActive = (item: (typeof NAV)[number]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-[1400px]">
        <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-800 bg-slate-900/60 px-4 py-6 md:flex">
          <div className="mb-8 px-2">
            <p className="text-lg font-black tracking-tight">Buyseek</p>
            <p className="text-xs font-medium uppercase tracking-widest text-slate-500">Admin</p>
          </div>
          <nav className="flex flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive(item)
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-100'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto px-2 pt-6">
            <p className="truncate text-xs text-slate-500">{user.email}</p>
            <Link href="/" className="mt-1 inline-block text-xs text-slate-400 hover:text-slate-200">
              ← Salir del panel
            </Link>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center gap-2 overflow-x-auto border-b border-slate-800 bg-slate-900/60 px-4 py-3 md:hidden">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  isActive(item) ? 'bg-slate-100 text-slate-900' : 'text-slate-400'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </header>
          <main className="min-w-0 flex-1 px-4 py-6 md:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
