'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminApi, type AdminModerationDashboard } from '@/lib/admin';
import {
  ActionButton,
  Badge,
  EmptyState,
  PageHeader,
  TableShell,
  Td,
  Th,
} from '@/components/admin/ui';

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <div className="mb-3">
        <h2 className="text-base font-bold text-white">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

export default function AdminModerationPage() {
  const [data, setData] = useState<AdminModerationDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await adminApi.moderation());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    try {
      await fn();
      await load();
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div>
        <PageHeader title="Moderación" subtitle="Sistema de moderación automática por reportes" />
        <EmptyState>Cargando…</EmptyState>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div>
      <PageHeader
        title="Moderación"
        subtitle="Acciones automáticas por reportes de la comunidad. Nada se elimina automáticamente."
      />

      {data.priorityAlerts.length > 0 && (
        <div className="mb-6 rounded-xl border border-red-500/40 bg-red-500/10 p-4">
          <p className="text-sm font-bold text-red-300">
            ⚠ {data.priorityAlerts.length} usuario(s) con prioridad máxima (≥50 reportes)
          </p>
          <p className="mt-1 text-xs text-red-200/80">
            Requieren revisión manual urgente:{' '}
            {data.priorityAlerts.map((u) => `${u.name} (${u.uniqueReports})`).join(', ')}
          </p>
        </div>
      )}

      <Section
        title="Solicitudes ocultadas automáticamente"
        subtitle="Ocultas del marketplace, visibles para su dueño con aviso de revisión."
      >
        {data.hiddenRequests.length === 0 ? (
          <EmptyState>No hay solicitudes ocultas.</EmptyState>
        ) : (
          <TableShell>
            <thead>
              <tr>
                <Th>Solicitud</Th>
                <Th>Dueño</Th>
                <Th>País</Th>
                <Th>Acciones</Th>
              </tr>
            </thead>
            <tbody>
              {data.hiddenRequests.map((r) => (
                <tr key={r.id}>
                  <Td>
                    <p className="font-semibold text-white">{r.title}</p>
                    <p className="text-xs text-slate-500">{r.id.slice(-8)}</p>
                  </Td>
                  <Td>
                    <p className="text-sm">{r.user.name}</p>
                    <p className="text-xs text-slate-500">{r.user.email}</p>
                  </Td>
                  <Td className="text-xs text-slate-400">{r.country}</Td>
                  <Td>
                    <ActionButton
                      tone="primary"
                      disabled={busy === `req-${r.id}`}
                      onClick={() => void run(`req-${r.id}`, () => adminApi.restoreRequest(r.id))}
                    >
                      Restaurar
                    </ActionButton>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </Section>

      <Section
        title="Ofertas ocultadas automáticamente"
        subtitle="Ocultas del marketplace, visibles para el vendedor con aviso de revisión."
      >
        {data.hiddenOffers.length === 0 ? (
          <EmptyState>No hay ofertas ocultas.</EmptyState>
        ) : (
          <TableShell>
            <thead>
              <tr>
                <Th>Oferta</Th>
                <Th>Vendedor</Th>
                <Th>Precio</Th>
                <Th>Acciones</Th>
              </tr>
            </thead>
            <tbody>
              {data.hiddenOffers.map((o) => (
                <tr key={o.id}>
                  <Td>
                    <p className="font-semibold text-white">{o.requestTitle}</p>
                    <p className="text-xs text-slate-500">{o.id.slice(-8)}</p>
                  </Td>
                  <Td>
                    <p className="text-sm">{o.seller.name}</p>
                    <p className="text-xs text-slate-500">{o.seller.email}</p>
                  </Td>
                  <Td className="text-xs text-slate-400">
                    {o.currency} {o.price.toLocaleString()}
                  </Td>
                  <Td>
                    <ActionButton
                      tone="primary"
                      disabled={busy === `off-${o.id}`}
                      onClick={() => void run(`off-${o.id}`, () => adminApi.restoreOffer(o.id))}
                    >
                      Restaurar
                    </ActionButton>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </Section>

      <Section
        title="Usuarios suspendidos automáticamente"
        subtitle="Suspensión preventiva. Pueden iniciar sesión pero no operar."
      >
        {data.suspendedUsers.length === 0 ? (
          <EmptyState>No hay usuarios suspendidos.</EmptyState>
        ) : (
          <TableShell>
            <thead>
              <tr>
                <Th>Usuario</Th>
                <Th>Desde</Th>
                <Th>Motivo</Th>
                <Th>Acciones</Th>
              </tr>
            </thead>
            <tbody>
              {data.suspendedUsers.map((u) => (
                <tr key={u.id}>
                  <Td>
                    <p className="text-sm font-semibold text-white">{u.name}</p>
                    <p className="text-xs text-slate-500">{u.email}</p>
                  </Td>
                  <Td className="whitespace-nowrap text-xs text-slate-400">
                    {u.suspendedAt ? new Date(u.suspendedAt).toLocaleDateString() : '—'}
                  </Td>
                  <Td className="max-w-[260px] text-xs text-slate-500">{u.suspendedReason ?? '—'}</Td>
                  <Td>
                    <ActionButton
                      tone="primary"
                      disabled={busy === `usr-${u.id}`}
                      onClick={() => void run(`usr-${u.id}`, () => adminApi.unsuspendUser(u.id))}
                    >
                      Levantar suspensión
                    </ActionButton>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </Section>

      <div className="grid gap-8 lg:grid-cols-2">
        <Section title="Contenido más reportado" subtitle="Reportes únicos por publicación.">
          {data.topReportedContent.length === 0 ? (
            <EmptyState>Sin datos.</EmptyState>
          ) : (
            <TableShell>
              <thead>
                <tr>
                  <Th>Tipo</Th>
                  <Th>Título</Th>
                  <Th>Reportes</Th>
                </tr>
              </thead>
              <tbody>
                {data.topReportedContent.map((c) => (
                  <tr key={`${c.type}-${c.id}`}>
                    <Td>
                      <Badge tone={c.type === 'offer' ? 'blue' : 'neutral'}>
                        {c.type === 'offer' ? 'Oferta' : 'Solicitud'}
                      </Badge>
                    </Td>
                    <Td className="max-w-[220px] truncate text-sm">{c.title}</Td>
                    <Td className="font-semibold text-white">{c.uniqueReports}</Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          )}
        </Section>

        <Section title="Usuarios más reportados" subtitle="Reportes únicos recibidos.">
          {data.topReportedUsers.length === 0 ? (
            <EmptyState>Sin datos.</EmptyState>
          ) : (
            <TableShell>
              <thead>
                <tr>
                  <Th>Usuario</Th>
                  <Th>Reportes</Th>
                  <Th>Estado</Th>
                </tr>
              </thead>
              <tbody>
                {data.topReportedUsers.map((u) => (
                  <tr key={u.id}>
                    <Td>
                      <p className="text-sm">{u.name}</p>
                      <p className="text-xs text-slate-500">{u.email}</p>
                    </Td>
                    <Td className="font-semibold text-white">{u.uniqueReports}</Td>
                    <Td>
                      {u.highPriority ? (
                        <Badge tone="red">Prioridad máxima</Badge>
                      ) : u.blocked ? (
                        <Badge tone="red">Bloqueado</Badge>
                      ) : u.suspended ? (
                        <Badge tone="amber">Suspendido</Badge>
                      ) : u.suspendThreshold ? (
                        <Badge tone="amber">≥25</Badge>
                      ) : (
                        <Badge tone="neutral">—</Badge>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          )}
        </Section>
      </div>

      <Section title="Usuarios que más reportan" subtitle="Útil para detectar abuso del sistema.">
        {data.topReporters.length === 0 ? (
          <EmptyState>Sin datos.</EmptyState>
        ) : (
          <TableShell>
            <thead>
              <tr>
                <Th>Usuario</Th>
                <Th>Reportes enviados</Th>
              </tr>
            </thead>
            <tbody>
              {data.topReporters.map((u) => (
                <tr key={u.id}>
                  <Td>
                    <p className="text-sm">{u.name}</p>
                    <p className="text-xs text-slate-500">{u.email}</p>
                  </Td>
                  <Td className="font-semibold text-white">{u.reportsSent}</Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </Section>
    </div>
  );
}
