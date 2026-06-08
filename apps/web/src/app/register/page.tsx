'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, setToken } from '@/lib/api';
import { User } from '@/lib/types';
import { getDashboardPath } from '@/lib/auth';
import { Header } from '@/components/Header';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: '',
    password: '',
    name: '',
    role: 'BUYER',
    country: 'AR',
    currency: 'ARS',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function update(field: string, value: string) {
    setForm((f) => {
      const next = { ...f, [field]: value };
      if (field === 'country' && value === 'US') next.currency = 'USD';
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api<{ token: string; user: User }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setToken(res.token);
      router.push(getDashboardPath(res.user.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-2xl font-bold">Crear cuenta</h1>
        <form onSubmit={handleSubmit} className="mt-8 space-y-4 rounded-xl border bg-white p-6 shadow-sm">
          {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
          <div>
            <label className="text-sm font-semibold">Nombre</label>
            <input className="mt-1 w-full rounded-lg border px-3 py-2" value={form.name} onChange={(e) => update('name', e.target.value)} required />
          </div>
          <div>
            <label className="text-sm font-semibold">Email</label>
            <input className="mt-1 w-full rounded-lg border px-3 py-2" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} required />
          </div>
          <div>
            <label className="text-sm font-semibold">Contraseña</label>
            <input className="mt-1 w-full rounded-lg border px-3 py-2" type="password" value={form.password} onChange={(e) => update('password', e.target.value)} minLength={6} required />
          </div>
          <div>
            <label className="text-sm font-semibold">Rol</label>
            <select className="mt-1 w-full rounded-lg border px-3 py-2" value={form.role} onChange={(e) => update('role', e.target.value)}>
              <option value="BUYER">Comprador</option>
              <option value="SELLER">Vendedor</option>
              <option value="BOTH">Ambos</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold">País</label>
              <select className="mt-1 w-full rounded-lg border px-3 py-2" value={form.country} onChange={(e) => update('country', e.target.value)}>
                <option value="AR">Argentina</option>
                <option value="US">Estados Unidos</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold">Moneda</label>
              <select className="mt-1 w-full rounded-lg border px-3 py-2" value={form.currency} onChange={(e) => update('currency', e.target.value)}>
                <option value="ARS">ARS</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>
          <button disabled={loading} className="w-full rounded-lg bg-indigo-600 py-3 font-semibold text-white disabled:opacity-50">
            {loading ? 'Creando...' : 'Registrarse'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          ¿Ya tenés cuenta? <Link href="/login" className="text-indigo-600 font-semibold">Entrar</Link>
        </p>
      </main>
    </>
  );
}
