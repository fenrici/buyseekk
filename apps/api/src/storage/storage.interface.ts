export const STORAGE_PROVIDER = {
  LOCAL: 'local',
  R2: 'r2',
} as const;

export type StorageProvider = (typeof STORAGE_PROVIDER)[keyof typeof STORAGE_PROVIDER];

export interface StorageService {
  upload(buffer: Buffer, ext: string, contentType: string): Promise<string>;
  getAllowedUrlPrefixes(): string[];
}

export const STORAGE_SERVICE = Symbol('STORAGE_SERVICE');
