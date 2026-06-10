'use client';

import { getImageUrl } from '@/lib/api';

type AvatarProps = {
  name: string;
  url?: string | null;
  size?: number;
  className?: string;
};

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
}

export function Avatar({ name, url, size = 40, className = '' }: AvatarProps) {
  const src = getImageUrl(url);
  const style = { width: size, height: size, fontSize: Math.max(11, size * 0.38) };

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        style={style}
        className={`shrink-0 rounded-full border border-white/15 object-cover ${className}`}
      />
    );
  }

  return (
    <span
      style={style}
      aria-hidden="true"
      className={`flex shrink-0 select-none items-center justify-center rounded-full border border-white/15 bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-600 font-bold text-white ${className}`}
    >
      {initialsOf(name)}
    </span>
  );
}
