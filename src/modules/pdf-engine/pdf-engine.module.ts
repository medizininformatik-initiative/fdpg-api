import { Module } from '@nestjs/common';
import { AzureStorageModule } from '../azure-storage/azure-storage.module';
import { PdfEngineClient } from './pdf-engine.client';
import { PdfEngineService } from './pdf-engine.service';

@Module({
  imports: [AzureStorageModule],
  providers: [PdfEngineClient, PdfEngineService],
  exports: [PdfEngineService],
})
export class PdfEngineModule {}
