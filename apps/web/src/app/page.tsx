import Link from 'next/link';
import { Header } from '@/components/Header';

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <section className="hero">
          <div className="hero-pattern" />
          <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 px-6 md:grid-cols-2">
            <div>
              <span className="hero-badge">Mercado invertido</span>
              <h1 className="mt-5 text-4xl font-extrabold leading-tight md:text-5xl">
                Publicá lo que buscás.<br />Recibí ofertas reales.
              </h1>
              <p className="mt-5 max-w-lg text-lg text-slate-300">
                Compradores publican necesidades. Vendedores compiten con la mejor propuesta en autos e inmuebles.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/login?role=buyer" className="btn btn-primary btn-lg">Soy comprador</Link>
                <Link href="/login?role=seller" className="btn btn-lg border-2 border-white/30 bg-transparent text-white hover:bg-white/10">
                  Soy vendedor
                </Link>
              </div>
              <div className="mt-10 flex flex-wrap gap-8">
                <div><strong className="block text-2xl">AR + US</strong><span className="text-sm text-slate-400">Dos mercados</span></div>
                <div><strong className="block text-2xl">0%</strong><span className="text-sm text-slate-400">Comisión inicial</span></div>
                <div><strong className="block text-2xl">Chat</strong><span className="text-sm text-slate-400">Post-oferta</span></div>
              </div>
            </div>
            <div className="card hidden rotate-1 overflow-hidden transition hover:rotate-0 md:block">
              <div className="relative">
                <img src="/images/ferrari-488.jpg" alt="Preview" className="h-48 w-full object-cover" />
                <span className="absolute right-3 top-3 rounded-full bg-slate-900/75 px-3 py-1 text-xs font-semibold text-white">
                  ● 3 ofertas
                </span>
              </div>
              <div className="p-5">
                <span className="tag tag-autos">Autos</span>
                <h3 className="mt-2 font-bold">Busco Ferrari 488 GTB 2019+</h3>
                <p className="mt-1 font-extrabold text-[var(--accent)]">$240,000 USD</p>
                <div className="mt-4 flex items-center gap-3 border-t pt-4">
                  <div className="avatar">CM</div>
                  <div>
                    <span className="text-sm font-semibold">Carlos M.</span>
                    <p className="text-xs text-amber-500">★★★★★ 4.9</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-center text-3xl font-extrabold">Cómo funciona</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              ['1. Publicás', 'Describís qué buscás, presupuesto y fotos de referencia.'],
              ['2. Ofertan', 'Vendedores compiten con precio, propuesta e imágenes reales.'],
              ['3. Coordinás', 'Aceptás la mejor oferta y charlás por chat para cerrar.'],
            ].map(([title, desc]) => (
              <div key={title} className="card p-6">
                <h3 className="text-lg font-bold text-[var(--primary)]">{title}</h3>
                <p className="mt-2 text-sm text-[var(--text-muted)]">{desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
