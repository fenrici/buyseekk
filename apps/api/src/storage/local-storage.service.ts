import { Injectable } from '@nestjs/common';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { StorageService } from './storage.interface';

const UPLOAD_DIR = join(process.cwd(), 'uploads');

@Injectable()
export class LocalStorageService implements StorageService {
  getAllowedUrlPrefixes(): string[] {
    return ['/api/uploads/'];
  }

  async upload(buffer: Buffer, ext: string, _contentType: string): Promise<string> {
    await mkdir(UPLOAD_DIR, { recursive: true });
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    await writeFile(join(UPLOAD_DIR, filename), buffer);
    return `/api/uploads/${filename}`;
  }
}
