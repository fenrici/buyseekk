import { OfferItem } from '@/lib/types';
import { formatMoney } from '@/lib/api';
import { ImageGallery } from '@/components/ImageGallery';

const diffStyles = {
  under: 'bg-emerald-100 text-emerald-700',
  at: 'bg-indigo-100 text-indigo-700',
  over: 'bg-red-100 text-red-700',
};

export function CompareBlock({ offer, perspective = 'buyer' }: { offer: OfferItem; perspective?: 'buyer' | 'seller' }) {
  const period = offer.requestBudgetPeriod ?? '';
  const style = diffStyles[offer.comparison.status];
  const isBuyer = perspective === 'buyer';
  return (
    <div className="compare-block mt-4">
      <div className="border-b border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-800">
        ⚖️ {isBuyer ? 'Tu solicitud vs. esta oferta' : 'Solicitud del comprador vs. tu oferta'}
      </div>
      <div className="grid gap-0 md:grid-cols-2">
        <div className="space-y-3 border-b border-slate-200 p-4 md:border-b-0 md:border-r">
          <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">{isBuyer ? 'Lo que pediste' : 'Lo que pidió'}</p>
          <ImageGallery urls={offer.request?.imageUrls} alt="Referencia del comprador" className="h-52 md:h-60" />
          <div>
            <p className="text-xs text-slate-500">Presupuesto</p>
            <p className="font-semibold">{formatMoney(offer.requestBudget, offer.currency, period)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Ubicación</p>
            <p className="text-sm">{offer.requestLocation}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Requisitos</p>
            <p className="text-sm text-slate-700">{offer.requestRequirements}</p>
          </div>
        </div>
        <div className="space-y-3 bg-emerald-50/50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">{isBuyer ? 'Lo que ofrece' : 'Tu oferta'}</p>
          <ImageGallery urls={offer.imageUrls} alt="Producto ofrecido" className="h-52 md:h-60" />
          <div>
            <p className="text-xs text-slate-500">Precio</p>
            <p className="text-xl font-extrabold text-emerald-600">{formatMoney(offer.price, offer.currency)}</p>
            <span className={`mt-1 inline-flex rounded-full px-2 py-1 text-xs font-semibold ${style}`}>
              {offer.comparison.label}
            </span>
          </div>
          <div>
            <p className="text-xs text-slate-500">{isBuyer ? 'Vendedor' : 'Comprador'}</p>
            <p className="text-sm font-semibold">
              {isBuyer ? offer.seller?.name : offer.request?.user?.name ?? '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Propuesta</p>
            <p className="text-sm text-slate-700">{offer.message}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
