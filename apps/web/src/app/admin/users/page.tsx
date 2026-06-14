'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminApi, type AdminPaginated, type AdminUser } from '@/lib/admin';
import {
  ActionButton,
  Badge,
  ConfirmDialog,
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

type Filters = {
  search: string;
  role: string;
  emailVerified: string;
  blocked: string;
  country: string;
  createdFrom: string;
};

const EMPTY: Filters = { search: '', role: '', emailVerified: '', blocked: '', country: '', createdFrom: '' };

export default function AdminUsersPage() {
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_ADMIN_LIMIT);
  const [data, setData] = useState<AdminPaginated<AdminUser>>({
    items: [],
    meta: EMPTY_PAGINATION_META,
  });
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<{ user: AdminUser; action: 'block' } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(
        await adminApi.users({
          page,
          limit,
          search: filters.search || undefined,
          role: filters.role || undefined,
          emailVerified: filters.emailVerified || undefined,
          blocked: filters.blocked || undefined,
          country: filters.country || undefined,
          createdFrom: filters.createdFrom || undefined,
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

  const patchUser = (updated: AdminUser) =>
    setData((d) => ({ ...d, items: d.items.map((u) => (u.id === updated.id ? updated : u)) }));

  const doBlock = async (reason?: string) => {
    if (!confirm) return;
    setBusy(true);
    try {
      const updated = await adminApi.blockUser(confirm.user.id, reason);
      patchUser(updated);
      setConfirm(null);
    } finally {
      setBusy(false);
    }
  };

  const doUnblock = async (user: AdminUser) => {
    patchUser(await adminApi.unblockUser(user.id));
  };

  const doVerify = async (user: AdminUser) => {
    patchUser(await adminApi.verifyUserEmail(user.id));
  };

  return (
    <div>
      <PageHeader title="Usuarios" subtitle={`${data.meta.total} usuarios`} />

      <Toolbar>
        <TextInput
          placeholder="Buscar nombre o email"
          value={filters.search}
          onChange={(e) => set({ search: e.target.value })}
          className="min-w-[200px] flex-1"
        />
        <Select value={filters.role} onChange={(e) => set({ role: e.target.value })}>
          <option value="">Todos los roles</option>
          <option value="BUYER">Comprador</option>
          <option value="SELLER">Vendedor</option>
          <option value="BOTH">Ambos</option>
          <option value="ADMIN">Admin</option>
        </Select>
        <Select value={filters.emailVerified} onChange={(e) => set({ emailVerified: e.target.value })}>
          <option value="">Verificación</option>
          <option value="true">Verificados</option>
          <option value="false">Sin verificar</option>
        </Select>
        <Select value={filters.blocked} onChange={(e) => set({ blocked: e.target.value })}>
          <option value="">Estado</option>
          <option value="false">Activos</option>
          <option value="true">Bloqueados</option>
        </Select>
        <Select value={filters.country} onChange={(e) => set({ country: e.target.value })}>
          <option value="">País</option>
          <option value="AR">AR</option>
          <option value="US">US</option>
        </Select>
        <TextInput type="date" value={filters.createdFrom} onChange={(e) => set({ createdFrom: e.target.value })} />
      </Toolbar>

      {loading ? (
        <EmptyState>Cargando…</EmptyState>
      ) : data.items.length === 0 ? (
        <EmptyState>No hay usuarios con estos filtros.</EmptyState>
      ) : (
        <TableShell>
          <thead>
            <tr>
              <Th>Usuario</Th>
              <Th>Rol</Th>
              <Th>País</Th>
              <Th>Email</Th>
              <Th>Estado</Th>
              <Th>Alta</Th>
              <Th>Acciones</Th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((u) => (
              <tr key={u.id}>
                <Td>
                  <p className="font-semibold text-white">{u.name}</p>
                  <p className="text-xs text-slate-500">{u.email}</p>
                </Td>
                <Td>
                  <Badge tone={u.role === 'ADMIN' ? 'blue' : 'neutral'}>{u.role}</Badge>
                </Td>
                <Td>{u.country}</Td>
                <Td>
                  {u.emailVerified ? <Badge tone="green">Verificado</Badge> : <Badge tone="amber">Pendiente</Badge>}
                </Td>
                <Td>
                  {u.blocked ? (
                    <span title={u.blockedReason ?? ''}>
                      <Badge tone="red">Bloqueado</Badge>
                    </span>
                  ) : (
                    <Badge tone="green">Activo</Badge>
                  )}
                </Td>
                <Td className="whitespace-nowrap text-xs text-slate-400">
                  {new Date(u.createdAt).toLocaleDateString()}
                </Td>
                <Td>
                  <div className="flex flex-wrap gap-1.5">
                    {u.blocked ? (
                      <ActionButton tone="primary" onClick={() => void doUnblock(u)}>
                        Desbloquear
                      </ActionButton>
                    ) : (
                      <ActionButton
                        tone="danger"
                        onClick={() => setConfirm({ user: u, action: 'block' })}
                        disabled={u.role === 'ADMIN'}
                      >
                        Bloquear
                      </ActionButton>
                    )}
                    {!u.emailVerified && (
                      <ActionButton onClick={() => void doVerify(u)}>Verificar email</ActionButton>
                    )}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}

      <Pagination meta={data.meta} onPage={setPage} onLimit={changeLimit} />

      <ConfirmDialog
        open={!!confirm}
        title="Bloquear usuario"
        message={`Vas a bloquear a ${confirm?.user.name}. No podrá publicar, ofertar, chatear ni editar su perfil.`}
        confirmLabel="Bloquear"
        withReason
        busy={busy}
        onConfirm={(reason) => void doBlock(reason)}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
