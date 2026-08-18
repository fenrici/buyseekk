import { Injectable, Logger } from '@nestjs/common';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { dirname, join, resolve, sep } from 'path';
import { buildOwnedObjectKey, isSafeObjectKey } from './storage-keys';
import { StorageService } from './storage.interface';

const UPLOAD_DIR = join(process.cwd(), 'uploads');

@Injectable()
export class LocalStorageService implements StorageService {
  private readonly logger = new Logger(LocalStorageService.name);

  getAllowedUrlPrefixes(): string[] {
    return ['/api/uploads/'];
  }

  async upload(buffer: Buffer, ext: string, _contentType: string, ownerUserId: string): Promise<string> {
    const key = buildOwnedObjectKey(ownerUserId, ext);
    const relative = key.slice('uploads/'.length);
    const fullPath = resolve(join(UPLOAD_DIR, relative));
    this.assertPathInsideUploadDir(fullPath);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, buffer);
    return `/api/uploads/${relative}`;
  }

  async deleteObject(key: string): Promise<void> {
    if (!isSafeObjectKey(key)) return;
    const relative = key.startsWith('uploads/') ? key.slice('uploads/'.length) : key;
    const fullPath = resolve(join(UPLOAD_DIR, relative));
    this.assertPathInsideUploadDir(fullPath);
    try {
      await unlink(fullPath);
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === 'ENOENT') return;
      throw err;
    }
  }

  private assertPathInsideUploadDir(fullPath: string) {
    const root = resolve(UPLOAD_DIR);
    if (fullPath !== root && !fullPath.startsWith(root + sep)) {
      this.logger.warn('Rejected local storage path outside upload dir');
      throw new Error('invalid storage path');
    }
  }
}
