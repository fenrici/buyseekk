import type { NextConfig } from 'next';

function storageImagePatterns(): NonNullable<NextConfig['images']>['remotePatterns'] {
  const patterns: NonNullable<NextConfig['images']>['remotePatterns'] = [];
  const host = process.env.NEXT_PUBLIC_STORAGE_HOST?.trim();
  if (host) {
    patterns.push({ protocol: 'https', hostname: host });
  }
  patterns.push({ protocol: 'https', hostname: '**.r2.dev' });
  patterns.push({ protocol: 'https', hostname: '**.r2.cloudflarestorage.com' });
  return patterns;
}

const isProductionBuild =
  process.env.NEXT_PHASE === 'phase-production-build' ||
  process.env.npm_lifecycle_event === 'build';

if (isProductionBuild && process.env.NODE_ENV === 'production') {
  if (!process.env.NEXT_PUBLIC_API_URL?.trim()) {
    throw new Error('NEXT_PUBLIC_API_URL is required for production builds');
  }
  if (!process.env.NEXT_PUBLIC_SITE_URL?.trim()) {
    throw new Error('NEXT_PUBLIC_SITE_URL is required for production builds');
  }
}

const nextConfig: NextConfig = {
  transpilePackages: ['@buyseekk/shared'],
  images: {
    remotePatterns: storageImagePatterns(),
  },
};

export default nextConfig;
