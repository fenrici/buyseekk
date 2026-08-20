import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  extractObjectKeyFromUrl,
  ownedObjectKeyForUser,
} from './storage-keys';
import { STORAGE_SERVICE, StorageService } from './storage.interface';

@Injectable()
export class StorageObjectsService {
  private readonly logger = new Logger(StorageObjectsService.name);

  constructor(
    @Inject(STORAGE_SERVICE) private storage: StorageService,
    private prisma: PrismaService,
  ) {}

  uploadOwned(userId: string, buffer: Buffer, ext: string, contentType: string) {
    return this.storage.upload(buffer, ext, contentType, userId);
  }

  async isStorageUrlReferenced(url: string): Promise<boolean> {
    const [userCount, requestCount, offerCount] = await Promise.all([
      this.prisma.user.count({
        where: { OR: [{ buyerAvatarUrl: url }, { sellerAvatarUrl: url }] },
      }),
      this.prisma.request.count({ where: { imageUrls: { has: url } } }),
      this.prisma.offer.count({ where: { imageUrls: { has: url } } }),
    ]);
    return userCount + requestCount + offerCount > 0;
  }

  async deleteIfUnreferencedBestEffort(
    urls: Array<string | null | undefined>,
    userId: string,
  ) {
    for (const url of urls) {
      if (!url) continue;
      const key = extractObjectKeyFromUrl(url, this.storage.getAllowedUrlPrefixes());
      if (!key || !ownedObjectKeyForUser(key, userId)) continue;
      if (await this.isStorageUrlReferenced(url)) continue;
      try {
        await this.storage.deleteObject(key);
      } catch (err) {
        this.logger.error(
          `Storage delete failed key=${key}`,
          err instanceof Error ? err.stack : err,
        );
      }
    }
  }

  async deleteRemovedBestEffort(
    previous: Array<string | null | undefined> | null | undefined,
    next: Array<string | null | undefined> | null | undefined,
    userId: string,
  ) {
    const nextSet = new Set((next ?? []).filter((url): url is string => !!url));
    const removed = (previous ?? []).filter((url): url is string => !!url && !nextSet.has(url));
    await this.deleteIfUnreferencedBestEffort(removed, userId);
  }

  async withCreateCompensation<T>(
    urls: Array<string | null | undefined> | undefined,
    userId: string,
    work: () => Promise<T>,
  ): Promise<T> {
    try {
      return await work();
    } catch (err) {
      await this.deleteIfUnreferencedBestEffort(urls ?? [], userId);
      throw err;
    }
  }
}
