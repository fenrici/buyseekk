'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminApi, type AdminPaginated, type AdminSecurityLog } from '@/lib/admin';
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
  TextInput,
  Th,
  Toolbar,
} from '@/components/admin/ui';

const EVENTS = [
  'USER_REGISTERED',
  'LOGIN_SUCCESS',
  'LOGIN_FAILED',
  'PASSWORD_RESET_REQUESTED',
  'PASSWORD_CHANGED',
  'EMAIL_VERIFIED',
  'LOGOUT',
  'ADMIN_USER_BLOCKED',
  'ADMIN_USER_UNBLOCKED',
  'ADMIN_USER_EMAIL_VERIFIED',
  'ADMIN_OFFER_DELETED',
  'ADMIN_REQUEST_CLOSED',
  'ADMIN_REQUEST_REACTIVATED',
  'ADMIN_REQUEST_DELETED',
  'ADMIN_MESSAGE_DELETED',
  'ADMIN_REPORT_STATUS_CHANGED',
];

type Filters = { event: string; ip: string; userId: string; dateFrom: string; dateTo: string };
const EMPTY: Filters = { event: '', ip: '', userId: '', dateFrom: '', dateTo: '' };

export default function AdminSecurityLogsPage() {
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_ADMIN_LIMIT);
  const [data, setData] = useState<AdminPaginated<AdminSecurityLog>>({
    items: [],
    meta: EMPTY_PAGINATION_META,
  });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(
        await adminApi.securityLogs({
          page,
          limit,
          event: filters.event || undefined,
          ip: filters.ip || undefined,
          userId: filters.userId || undefined,
          dateFrom: filters.dateFrom || undefined,
          dateTo: filters.dateTo || undefined,
        }),
      );
    } finally {
      setLoading(false);
    }
  }, [page, limit, filters]);

  useEffect(() => {
    const id = setTimeout(() => void load(), 250);
    return () => clearTimeout(id);
  }, [load]);

  const set = (patch: Partial<Filters>) => {
    setPage(1);
    setFilters((f) => ({ ...f, ...patch }));
  };

  const changeLimit = (next: number) => {
    setPage(1);
    setLimit(next);
  };

  const isAdminEvent = (e: string) => e.startsWith('ADMIN_');

  return (
    <div>
      <PageHeader title="Logs de seguridad" subtitle={`${data.meta.total} eventos`} />

      <Toolbar>
        <Select value={filters.event} onChange={(e) => set({ event: e.target.value })}>
          <option value="">Todos los eventos</option>
          {EVENTS.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </Select>
        <TextInput placeholder="IP" value={filters.ip} onChange={(e) => set({ ip: e.target.value })} />
        <TextInput placeholder="User ID" value={filters.userId} onChange={(e) => set({ userId: e.target.value })} />
        <TextInput type="date" value={filters.dateFrom} onChange={(e) => set({ dateFrom: e.target.value })} />
        <TextInput type="date" value={filters.dateTo} onChange={(e) => set({ dateTo: e.target.value })} />
      </Toolbar>

      {loading ? (
        <EmptyState>Cargando…</EmptyState>
      ) : data.items.length === 0 ? (
        <EmptyState>No hay eventos con estos filtros.</EmptyState>
      ) : (
        <TableShell>
          <thead>
            <tr>
              <Th>Evento</Th>
              <Th>Usuario</Th>
              <Th>IP</Th>
              <Th>User-Agent</Th>
              <Th>Fecha</Th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((log) => (
              <tr key={log.id}>
                <Td>
                  <Badge tone={isAdminEvent(log.event) ? 'blue' : log.event === 'LOGIN_FAILED' ? 'red' : 'neutral'}>
                    {log.event}
                  </Badge>
                </Td>
                <Td>
                  {log.user ? (
                    <>
                      <p className="text-sm">{log.user.name}</p>
                      <p className="text-xs text-slate-500">{log.user.email}</p>
                    </>
                  ) : (
                    <span className="text-xs text-slate-500">—</span>
                  )}
                </Td>
                <Td className="whitespace-nowrap text-xs text-slate-400">{log.ip ?? '—'}</Td>
                <Td className="max-w-[260px] truncate text-xs text-slate-500">{log.userAgent ?? '—'}</Td>
                <Td className="whitespace-nowrap text-xs text-slate-400">
                  {new Date(log.createdAt).toLocaleString()}
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
