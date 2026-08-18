import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';

export const OBJECT_KEY_PREFIX = 'uploads';

const SAFE_USER_ID = /^[a-zA-Z0-9_-]{8,64}$/;
const OWNED_KEY =
  /^uploads\/([a-zA-Z0-9_-]{8,64})\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(jpg|jpeg|png|webp)$/i;
const UNSCOPED_KEY = /^uploads\/[^/]+$/;

export function getStorageUrlPrefixes(): string[] {
  const prefixes = ['/api/uploads/'];
  const publicUrl = process.env.STORAGE_PUBLIC_URL?.trim().replace(/\/$/, '');
  if (publicUrl) prefixes.push(`${publicUrl}/`);
  return prefixes;
}

export function buildOwnedObjectKey(userId: string, ext: string): string {
  if (!SAFE_USER_ID.test(userId)) {
    throw new BadRequestException('Usuario inválido para storage');
  }
  const normalized = ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`;
  return `${OBJECT_KEY_PREFIX}/${userId}/${randomUUID()}${normalized}`;
}

export function isSafeObjectKey(key: string): boolean {
  if (!key || key.includes('..') || key.includes('\\') || key.includes('\0')) return false;
  return key.startsWith(`${OBJECT_KEY_PREFIX}/`);
}

export function extractObjectKeyFromUrl(
  url: string,
  prefixes = getStorageUrlPrefixes(),
): string | null {
  if (!url || typeof url !== 'string') return null;
  if (url.includes('..') || url.includes('\\') || /%2e/i.test(url)) return null;

  const prefix = prefixes.find((item) => url.startsWith(item));
  if (!prefix) return null;

  const rest = url.slice(prefix.length).split('?')[0];
  if (!rest || rest.includes('..') || rest.startsWith('/')) return null;

  const key = prefix === '/api/uploads/' ? `${OBJECT_KEY_PREFIX}/${rest}` : rest;
  if (!isSafeObjectKey(key)) return null;
  return key;
}

export function ownedObjectKeyForUser(key: string, userId: string): boolean {
  const match = OWNED_KEY.exec(key);
  return !!match && match[1] === userId;
}

export function isUnscopedUploadKey(key: string): boolean {
  return UNSCOPED_KEY.test(key) && !OWNED_KEY.test(key);
}

export function assertUrlAttachable(url: string, userId: string, allowedExisting: ReadonlySet<string>) {
  if (allowedExisting.has(url)) return;
  const key = extractObjectKeyFromUrl(url);
  if (!key) {
    throw new BadRequestException('Solo se permiten imágenes subidas a la plataforma');
  }
  if (isUnscopedUploadKey(key)) {
    throw new BadRequestException('Las imágenes nuevas deben subirse a tu cuenta');
  }
  if (ownedObjectKeyForUser(key, userId)) return;
  throw new BadRequestException('No podés usar imágenes de otra cuenta');
}
