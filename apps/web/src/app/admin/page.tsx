'use client';

import { useEffect, useState } from 'react';
import { adminApi, type AdminOverview } from '@/lib/admin';
import { PageHeader } from '@/components/admin/ui';

const CARDS: { key: keyof AdminOverview; label: string; highlight?: boolean }[] = [
  { key: 'totalUsers', label: 'Usuarios' },
  { key: 'buyers', label: 'Compradores' },
  { key: 'sellers', label: 'Vendedores' },
  { key: 'verifiedUsers', label: 'Verificados' },
  { key: 'activeRequests', label: 'Solicitudes activas' },
  { key: 'offersSent', label: 'Ofertas enviadas' },
  { key: 'openChats', label: 'Chats abiertos' },
  { key: 'messagesSent', label: 'Mensajes' },
  { key: 'pendingReports', label: 'Reportes pendientes', highlight: true },
  { key: 'blockedUsers', label: 'Usuarios bloqueados', highlight: true },
  { key: 'suspendedUsers', label: 'Suspendidos (auto)', highlight: true },
  { key: 'hiddenRequests', label: 'Solicitudes ocultas', highlight: true },
  { key: 'hiddenOffers', label: 'Ofertas ocultas', highlight: true },
  { key: 'reviewRequiredContent', label: 'En revisión' },
];

export default function AdminOverviewPage() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .overview()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Error'));
  }, []);

  return (
    <div>
      <PageHeader title="Overview" subtitle="Estado general de la plataforma." />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {CARDS.map((card) => {
          const value = data ? data[card.key] : null;
          const isAlert = card.highlight && typeof value === 'number' && value > 0;
          return (
            <div
              key={card.key}
              className={`rounded-2xl border p-4 ${
                isAlert ? 'border-amber-500/40 bg-amber-500/5' : 'border-slate-800 bg-slate-900/50'
              }`}
            >
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{card.label}</p>
              <p className={`mt-2 text-2xl font-black ${isAlert ? 'text-amber-300' : 'text-white'}`}>
                {value ?? '—'}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
