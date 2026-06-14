'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminApi, type AdminPaginated, type AdminReport, type ReportStatus } from '@/lib/admin';
import {
  Badge,
  DEFAULT_ADMIN_LIMIT,
  EMPTY_PAGINATION_META,
  EmptyState,
  PageHeader,
  Pagination,
  Select,
  TableShell,
  Td,
  Th,
  Toolbar,
} from '@/components/admin/ui';

const STATUS_TONE: Record<ReportStatus, 'amber' | 'blue' | 'green' | 'neutral'> = {
  PENDING: 'amber',
  REVIEWED: 'blue',
  RESOLVED: 'green',
  DISMISSED: 'neutral',
};

const REASON_LABEL: Record<string, string> = {
  SPAM: 'Spam',
  SCAM: 'Estafa',
  INAPPROPRIATE_CONTENT: 'Contenido inapropiado',
  FAKE_OFFER: 'Oferta falsa',
  ABUSIVE_BEHAVIOR: 'Abuso',
  OTHER: 'Otro',
};

const STATUSES: ReportStatus[] = ['PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED'];

export default function AdminReportsPage() {
  const [status, setStatus] = useState('');
  const [reason, setReason] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_ADMIN_LIMIT);
  const [data, setData] = useState<AdminPaginated<AdminReport>>({
    items: [],
    meta: EMPTY_PAGINATION_META,
  });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(
        await adminApi.reports({
          page,
          limit,
          status: status || undefined,
          reason: reason || undefined,
        }),
      );
    } finally {
      setLoading(false);
    }
  }, [page, limit, status, reason]);

  useEffect(() => {
    load();
  }, [load]);

  const changeLimit = (next: number) => {
    setPage(1);
    setLimit(next);
  };

  const changeStatus = async (report: AdminReport, next: ReportStatus) => {
    const updated = await adminApi.updateReportStatus(report.id, next);
    setData((d) => ({ ...d, items: d.items.map((r) => (r.id === report.id ? { ...r, ...updated } : r)) }));
  };

  const target = (r: AdminReport) => {
    if (r.offerId) return `Oferta ${r.offerId.slice(-6)}`;
    if (r.requestId) return `Solicitud ${r.requestId.slice(-6)}`;
    if (r.messageId) return `Mensaje ${r.messageId.slice(-6)}`;
    if (r.chatId) return `Chat ${r.chatId.slice(-6)}`;
    if (r.reportedUser) return `Usuario ${r.reportedUser.name}`;
    return '—';
  };

  return (
    <div>
      <PageHeader title="Reportes" subtitle={`${data.meta.total} reportes`} />

      <Toolbar>
        <Select
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
        >
          <option value="">Todos los estados</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <Select
          value={reason}
          onChange={(e) => {
            setPage(1);
            setReason(e.target.value);
          }}
        >
          <option value="">Todos los motivos</option>
          {Object.entries(REASON_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
      </Toolbar>

      {loading ? (
        <EmptyState>Cargando…</EmptyState>
      ) : data.items.length === 0 ? (
        <EmptyState>No hay reportes con estos filtros.</EmptyState>
      ) : (
        <TableShell>
          <thead>
            <tr>
              <Th>Motivo</Th>
              <Th>Objetivo</Th>
              <Th>Reportado por</Th>
              <Th>Usuario reportado</Th>
              <Th>Fecha</Th>
              <Th>Estado</Th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((r) => (
              <tr key={r.id}>
                <Td>
                  <p className="font-semibold text-white">{REASON_LABEL[r.reason] ?? r.reason}</p>
                  {r.details && <p className="max-w-[260px] text-xs text-slate-500">{r.details}</p>}
                </Td>
                <Td className="text-xs text-slate-400">{target(r)}</Td>
                <Td>
                  <p className="text-sm">{r.reporter.name}</p>
                  <p className="text-xs text-slate-500">{r.reporter.email}</p>
                </Td>
                <Td>
                  {r.reportedUser ? (
                    <>
                      <p className="text-sm">{r.reportedUser.name}</p>
                      <p className="text-xs text-slate-500">{r.reportedUser.email}</p>
                    </>
                  ) : (
                    <span className="text-xs text-slate-500">—</span>
                  )}
                </Td>
                <Td className="whitespace-nowrap text-xs text-slate-400">
                  {new Date(r.createdAt).toLocaleDateString()}
                </Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
                    <Select
                      value={r.status}
                      onChange={(e) => void changeStatus(r, e.target.value as ReportStatus)}
                      className="!py-1 text-xs"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </Select>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}

      <Pagination meta={data.meta} onPage={setPage} onLimit={changeLimit} />
    </div>
  );
}
