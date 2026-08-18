import { BadRequestException } from '@nestjs/common';
import { MAX_IMAGES_PER_ENTITY } from '@buyseekk/shared';
import { assertUrlAttachable, getStorageUrlPrefixes } from '../../storage/storage-keys';

function validateEachUrl(urls: string[]) {
  if (urls.length > MAX_IMAGES_PER_ENTITY) {
    throw new BadRequestException(`Máximo ${MAX_IMAGES_PER_ENTITY} imágenes`);
  }
  const prefixes = getStorageUrlPrefixes();
  for (const url of urls) {
    if (!url || typeof url !== 'string') {
      throw new BadRequestException('URL de imagen inválida');
    }
    if (!prefixes.some((prefix) => url.startsWith(prefix))) {
      throw new BadRequestException('Solo se permiten imágenes subidas a la plataforma');
    }
    if (url.includes('..') || url.includes('\\') || /%2e/i.test(url)) {
      throw new BadRequestException('URL de imagen inválida');
    }
  }
}

export function validateImageUrls(urls: string[] | undefined) {
  if (!urls?.length) return;
  validateEachUrl(urls);
}

export function assertValidImageUrls(urls: string[] | undefined, label = 'imágenes') {
  if (!urls?.length) {
    throw new BadRequestException(`Subí al menos una foto (${label})`);
  }
  validateEachUrl(urls);
}

export function assertOwnedImageUrls(
  urls: string[] | undefined,
  userId: string,
  existingUrls: string[] = [],
) {
  if (!urls?.length) return;
  validateEachUrl(urls);
  const allowed = new Set(existingUrls);
  for (const url of urls) {
    assertUrlAttachable(url, userId, allowed);
  }
}
