'use client';

import { useRef, useState } from 'react';
import { getImageUrl, uploadImage } from '@/lib/api';
import { useT } from '@/lib/i18n';

import { MAX_IMAGES_PER_ENTITY } from '@buyseekk/shared';

const MAX_IMAGES = MAX_IMAGES_PER_ENTITY;
const MAX_MB = 10;

type Props = {
  label: string;
  hint?: string;
  value?: string[];
  onChange: (urls: string[]) => void;
  required?: boolean;
  maxImages?: number;
};

export function ImageUpload({
  label,
  hint,
  value = [],
  onChange,
  required,
  maxImages = MAX_IMAGES,
}: Props) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    const remaining = maxImages - value.length;
    if (remaining <= 0) {
      setError(t('images.maxHint', { max: String(maxImages), mb: String(MAX_MB) }));
      return;
    }

    const files = Array.from(fileList).slice(0, remaining);
    setError('');
    setUploading(true);

    try {
      const uploaded: string[] = [];
      for (const file of files) {
        const { url } = await uploadImage(file);
        uploaded.push(url);
      }
      onChange([...value, ...uploaded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function removeAt(index: number) {
    onChange(value.filter((_, i) => i !== index));
    setError('');
  }

  const canAddMore = value.length < maxImages;

  return (
    <div>
      <label className="text-sm font-semibold">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
      <p className="mt-0.5 text-xs text-slate-400">
        {t('images.maxHint', { max: String(maxImages), mb: String(MAX_MB) })}
      </p>

      {value.length > 0 && (
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {value.map((url, i) => (
            <div
              key={`${url}-${i}`}
              className="group relative flex h-36 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
            >
              <img src={getImageUrl(url)} alt={`${t('images.photo')} ${i + 1}`} className="max-h-full max-w-full object-contain" />
              <button
                type="button"
                onClick={() => removeAt(i)}
                disabled={uploading}
                aria-label={t('images.remove')}
                title={t('images.remove')}
                className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/65 text-sm font-bold text-white shadow-md transition hover:bg-black/80 disabled:opacity-50"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {canAddMore && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="mt-2 flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500 transition hover:border-indigo-300 hover:bg-indigo-50/50"
        >
          {uploading
            ? t('images.uploading')
            : value.length === 0
              ? t('images.pick', { max: String(maxImages) })
              : t('images.add', { n: String(value.length), max: String(maxImages) })}
        </button>
      )}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
