'use client';

import Link from 'next/link';
import { Header } from '@/components/Header';
import { useT } from '@/lib/i18n';

export default function HomePage() {
  const t = useT();

  return (
    <>
      <Header />
      <main>
        <section className="hero">
          <div className="hero-pattern" />
          <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 px-6 md:grid-cols-2">
            <div>
              <span className="hero-badge">{t('home.badge')}</span>
              <h1 className="mt-5 text-4xl font-extrabold leading-tight md:text-5xl">
                {t('home.title1')}<br />{t('home.title2')}
              </h1>
              <p className="mt-5 max-w-lg text-lg text-slate-300">{t('home.subtitle')}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/login?role=buyer" className="btn btn-primary btn-lg">{t('home.ctaBuyer')}</Link>
                <Link href="/login?role=seller" className="btn btn-lg border-2 border-white/30 bg-transparent text-white hover:bg-white/10">
                  {t('home.ctaSeller')}
                </Link>
              </div>
              <div className="mt-10 flex flex-wrap gap-8">
                <div><strong className="block text-2xl">AR + US</strong><span className="text-sm text-slate-400">{t('home.statMarkets')}</span></div>
                <div><strong className="block text-2xl">0%</strong><span className="text-sm text-slate-400">{t('home.statFee')}</span></div>
                <div><strong className="block text-2xl">Chat</strong><span className="text-sm text-slate-400">{t('home.statChat')}</span></div>
              </div>
            </div>
            <div className="hero-card-preview mt-8 md:mt-0">
              <div className="hero-card-img">
                <img
                  src="/images/ferrari-488.jpg"
                  alt={t('home.previewAlt')}
                  className="h-[200px] w-full object-contain"
                />
                <span className="hero-card-live">{t('home.previewOffers')}</span>
              </div>
              <div className="hero-card-body">
                <span className="tag tag-autos">{t('seller.autos')}</span>
                <h3>{t('home.previewTitle')}</h3>
                <p className="budget">{t('home.previewBudget')}</p>
                <p className="hero-card-desc">{t('home.previewRequirements')}</p>
                <p className="hero-card-location">{t('home.previewLocation')}</p>
                <div className="hero-card-buyer">
                  <div className="avatar">CM</div>
                  <span className="font-semibold text-[var(--text)]">{t('home.previewBuyer')}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-center text-3xl font-extrabold">{t('home.howTitle')}</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              ['home.step1Title', 'home.step1Desc'],
              ['home.step2Title', 'home.step2Desc'],
              ['home.step3Title', 'home.step3Desc'],
            ].map(([title, desc]) => (
              <div key={title} className="card p-6">
                <h3 className="text-lg font-bold text-[var(--primary)]">{t(title)}</h3>
                <p className="mt-2 text-sm text-[var(--text-muted)]">{t(desc)}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
