'use client';

import { getImageUrl } from '@/lib/api';
import { useT } from '@/lib/i18n';

type Props = {
  urls?: string[] | null;
  alt: string;
  className?: string;
  /** Rellena el marco (una sola imagen). Por defecto true en detalle de solicitud. */
  cover?: boolean;
};

const frameBase =
  'relative overflow-hidden rounded-lg border border-slate-200 bg-slate-900/40';

export function ImageGallery({ urls, alt, className = 'h-48', cover = false }: Props) {
  const t = useT();
  const images = (urls ?? []).map(getImageUrl).filter(Boolean) as string[];
  if (images.length === 0) return null;

  const imgClass = cover
    ? 'h-full w-full object-cover'
    : 'max-h-full max-w-full object-contain';

  if (images.length === 1) {
    return (
      <div className={`${frameBase} ${className}`}>
        <img src={images[0]} alt={alt} className={imgClass} />
      </div>
    );
  }

  return (
    <div className={`flex gap-2 overflow-x-auto snap-x snap-mandatory ${className}`}>
      {images.map((src, i) => (
        <div
          key={`${src}-${i}`}
          className={`relative min-w-[88%] flex-shrink-0 snap-start ${frameBase} flex h-full items-center justify-center`}
        >
          <img src={src} alt={`${alt} ${i + 1}`} className={imgClass} />
          {i === 0 && (
            <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">
              {t('nav.photoCount', { count: images.length })}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
