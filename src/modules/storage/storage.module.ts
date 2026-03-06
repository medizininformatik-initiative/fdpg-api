import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { PublicStorageService } from './public-storage.service';

@Module({
  providers: [StorageService, PublicStorageService],
  exports: [StorageService, PublicStorageService],
})
export class StorageModule {}
