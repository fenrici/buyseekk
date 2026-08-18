import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LocalStorageService } from './local-storage.service';
import { R2StorageService } from './r2-storage.service';
import { StorageObjectsService } from './storage-objects.service';
import { STORAGE_PROVIDER, STORAGE_SERVICE, StorageService } from './storage.interface';

@Global()
@Module({
  providers: [
    LocalStorageService,
    R2StorageService,
    StorageObjectsService,
    {
      provide: STORAGE_SERVICE,
      inject: [ConfigService, LocalStorageService, R2StorageService],
      useFactory: (
        config: ConfigService,
        local: LocalStorageService,
        r2: R2StorageService,
      ): StorageService => {
        const provider = config.get<string>('STORAGE_PROVIDER', STORAGE_PROVIDER.LOCAL);
        if (provider === STORAGE_PROVIDER.R2) return r2;
        return local;
      },
    },
  ],
  exports: [STORAGE_SERVICE, StorageObjectsService],
})
export class StorageModule {}
