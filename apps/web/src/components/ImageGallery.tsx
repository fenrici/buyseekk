import { getImageUrl } from '@/lib/api';

type Props = {
  urls?: string[] | null;
  alt: string;
  className?: string;
};

const frameBase =
  'flex items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100';

export function ImageGallery({ urls, alt, className = 'h-48' }: Props) {
  const images = (urls ?? []).map(getImageUrl).filter(Boolean) as string[];
  if (images.length === 0) return null;

  const imgClass = 'max-h-full max-w-full object-contain';

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
          className={`relative min-w-[88%] flex-shrink-0 snap-start ${frameBase} h-full`}
        >
          <img src={src} alt={`${alt} ${i + 1}`} className={imgClass} />
          {i === 0 && (
            <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">
              {images.length} fotos
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
