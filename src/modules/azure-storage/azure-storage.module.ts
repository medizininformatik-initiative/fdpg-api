import { Module } from '@nestjs/common';
import { AzureStorageService } from './azure-storage.service';

@Module({
  providers: [AzureStorageService],
  exports: [AzureStorageService],
})
export class AzureStorageModule {}
