import { BadRequestException } from '@nestjs/common';
import { MAX_UPLOAD_BYTES } from '@buyseekk/shared';
import { extname } from 'path';

const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Detect JPEG/PNG/WebP from magic bytes (no external parser — stable in Docker/npm workspaces). */
function detectAllowedImage(buffer: Buffer): { ext: string; mime: string } | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ext: '.jpg', mime: 'image/jpeg' };
  }
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return { ext: '.png', mime: 'image/png' };
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { ext: '.webp', mime: 'image/webp' };
  }
  return null;
}

export function assertValidImageUpload(
  file: Express.Multer.File | undefined,
): { ext: string; mime: string } {
  if (!file?.buffer?.length) {
    throw new BadRequestException('No se recibió ninguna imagen');
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new BadRequestException('La imagen no puede superar 5 MB');
  }

  const declaredExt = extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXT.has(declaredExt) || !ALLOWED_MIME.has(file.mimetype)) {
    throw new BadRequestException('Solo se permiten imágenes JPG, PNG o WebP');
  }

  const detected = detectAllowedImage(file.buffer);
  if (!detected) {
    throw new BadRequestException(
      'El contenido del archivo no es una imagen JPG, PNG o WebP válida',
    );
  }

  return detected;
}

export const UPLOAD_ALLOWED_EXT = ALLOWED_EXT;
export const UPLOAD_ALLOWED_MIME = ALLOWED_MIME;
