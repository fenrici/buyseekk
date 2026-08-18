export const STORAGE_PROVIDER = {
  LOCAL: 'local',
  R2: 'r2',
} as const;

export type StorageProvider = (typeof STORAGE_PROVIDER)[keyof typeof STORAGE_PROVIDER];

export const STORAGE_CACHE_CONTROL = 'public, max-age=31536000, immutable';

export interface StorageService {
  upload(buffer: Buffer, ext: string, contentType: string, ownerUserId: string): Promise<string>;
  deleteObject(key: string): Promise<void>;
  getAllowedUrlPrefixes(): string[];
}

export const STORAGE_SERVICE = Symbol('STORAGE_SERVICE');
