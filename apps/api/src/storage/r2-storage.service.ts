import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { buildOwnedObjectKey, isSafeObjectKey } from './storage-keys';
import { STORAGE_CACHE_CONTROL, STORAGE_PROVIDER, StorageService } from './storage.interface';

@Injectable()
export class R2StorageService implements StorageService, OnModuleInit {
  private client!: S3Client;
  private bucket!: string;
  private publicBaseUrl!: string;

  constructor(private config: ConfigService) {}

  onModuleInit() {
    if (this.config.get('STORAGE_PROVIDER', STORAGE_PROVIDER.LOCAL) !== STORAGE_PROVIDER.R2) {
      return;
    }
    const accountId = this.config.getOrThrow<string>('R2_ACCOUNT_ID');
    const accessKeyId = this.config.getOrThrow<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.config.getOrThrow<string>('R2_SECRET_ACCESS_KEY');
    this.bucket = this.config.getOrThrow<string>('R2_BUCKET_NAME');
    this.publicBaseUrl = this.config.getOrThrow<string>('STORAGE_PUBLIC_URL').replace(/\/$/, '');

    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  getAllowedUrlPrefixes(): string[] {
    return [`${this.publicBaseUrl}/`];
  }

  async upload(buffer: Buffer, ext: string, contentType: string, ownerUserId: string): Promise<string> {
    const key = buildOwnedObjectKey(ownerUserId, ext);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        CacheControl: STORAGE_CACHE_CONTROL,
        ContentDisposition: 'inline',
      }),
    );
    return `${this.publicBaseUrl}/${key}`;
  }

  async deleteObject(key: string): Promise<void> {
    if (!isSafeObjectKey(key) || !this.client) return;
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }
}
