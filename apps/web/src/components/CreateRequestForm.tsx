'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { User } from '@/lib/types';
import { ImageUpload } from '@/components/ImageUpload';

export function CreateRequestForm({ user, onSuccess }: { user: User; onSuccess: () => void }) {
  const [error, setError] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [form, setForm] = useState({
    category: 'AUTOS',
    title: '',
    requirements: '',
    budget: '',
    location: '',
    country: user.country,
    currency: user.currency,
    operation: 'COMPRA',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api('/requests', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          budget: parseInt(form.budget),
          budgetPeriod: form.operation === 'ALQUILER' ? '/mes' : undefined,
          imageUrls,
        }),
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al publicar');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 rounded-xl border bg-white p-6 shadow-sm md:grid-cols-2">
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600 md:col-span-2">{error}</p>}
      <select className="rounded-lg border px-3 py-2" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
        <option value="AUTOS">Autos</option>
        <option value="INMOBILIARIA">Inmuebles</option>
      </select>
      <select className="rounded-lg border px-3 py-2" value={form.operation} onChange={(e) => setForm({ ...form, operation: e.target.value })}>
        <option value="COMPRA">Compra</option>
        <option value="ALQUILER">Alquiler</option>
      </select>
      <input className="rounded-lg border px-3 py-2 md:col-span-2" placeholder="¿Qué buscás?" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
      <input className="rounded-lg border px-3 py-2" type="number" placeholder="Presupuesto máximo" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} required />
      <input className="rounded-lg border px-3 py-2" placeholder="Ubicación" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} required />
      <select className="rounded-lg border px-3 py-2" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value as User['country'] })}>
        <option value="AR">Argentina</option>
        <option value="US">Estados Unidos</option>
      </select>
      <select className="rounded-lg border px-3 py-2" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value as User['currency'] })}>
        <option value="ARS">ARS</option>
        <option value="USD">USD</option>
      </select>
      <textarea className="rounded-lg border px-3 py-2 md:col-span-2" rows={4} placeholder="Requisitos y detalles" value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })} required />
      <div className="md:col-span-2">
        <ImageUpload
          label="Fotos de referencia"
          hint="Opcional — mostrá el estilo, modelo o tipo de producto que buscás"
          value={imageUrls}
          onChange={setImageUrls}
        />
      </div>
      <button className="rounded-lg bg-indigo-600 py-3 font-semibold text-white md:col-span-2">Publicar solicitud</button>
    </form>
  );
}
