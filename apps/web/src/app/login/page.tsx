'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, getToken, setToken } from '@/lib/api';
import { User } from '@/lib/types';
import { getDashboardPath } from '@/lib/auth';
import { Header } from '@/components/Header';

const DEMOS = {
  buyer: { email: 'comprador@buyseekk.com', password: 'demo1234', label: 'Comprador' },
  seller: { email: 'vendedor@buyseekk.com', password: 'demo1234', label: 'Vendedor' },
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleHint = searchParams.get('role');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (roleHint === 'seller') {
      setEmail(DEMOS.seller.email);
      setPassword(DEMOS.seller.password);
    } else if (roleHint === 'buyer') {
      setEmail(DEMOS.buyer.email);
      setPassword(DEMOS.buyer.password);
    }
  }, [roleHint]);

  function fillDemo(type: 'buyer' | 'seller') {
    setEmail(DEMOS[type].email);
    setPassword(DEMOS[type].password);
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api<{ token: string; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setToken(res.token);
      router.push(getDashboardPath(res.user.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-2xl font-bold">Iniciar sesión</h1>
        <p className="mt-2 text-sm text-slate-500">
          {roleHint === 'seller'
            ? 'Accedé como vendedor para ver solicitudes y enviar ofertas'
            : roleHint === 'buyer'
              ? 'Accedé como comprador para publicar y recibir ofertas'
              : 'Elegí una cuenta demo o usá la tuya'}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => fillDemo('buyer')}
            className="rounded-xl border-2 border-indigo-100 bg-indigo-50 p-4 text-left transition hover:border-indigo-300"
          >
            <span className="text-xs font-bold uppercase text-indigo-600">Comprador</span>
            <p className="mt-1 text-sm font-semibold">Carlos M.</p>
            <p className="text-xs text-slate-500">comprador@buyseekk.com</p>
          </button>
          <button
            type="button"
            onClick={() => fillDemo('seller')}
            className="rounded-xl border-2 border-emerald-100 bg-emerald-50 p-4 text-left transition hover:border-emerald-300"
          >
            <span className="text-xs font-bold uppercase text-emerald-600">Vendedor</span>
            <p className="mt-1 text-sm font-semibold">Luxury Motors Miami</p>
            <p className="text-xs text-slate-500">vendedor@buyseekk.com</p>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-xl border bg-white p-6 shadow-sm">
          {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
          <div>
            <label className="text-sm font-semibold">Email</label>
            <input className="mt-1 w-full rounded-lg border px-3 py-2" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="text-sm font-semibold">Contraseña</label>
            <input className="mt-1 w-full rounded-lg border px-3 py-2" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button disabled={loading} className="w-full rounded-lg bg-indigo-600 py-3 font-semibold text-white disabled:opacity-50">
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="mt-2 text-center text-xs text-slate-400">Contraseña demo: demo1234</p>
        <p className="mt-4 text-center text-sm text-slate-500">
          ¿No tenés cuenta? <Link href="/register" className="font-semibold text-indigo-600">Registrate</Link>
        </p>
        {getToken() && (
          <p className="mt-3 text-center text-xs text-amber-600">
            Si ya estabas logueado, al entrar se reemplaza la sesión anterior.
          </p>
        )}
      </main>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="p-8">Cargando...</main>}>
      <LoginForm />
    </Suspense>
  );
}
