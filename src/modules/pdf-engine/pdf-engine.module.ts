import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { PdfEngineClient } from './pdf-engine.client';
import { PdfEngineService } from './pdf-engine.service';

@Module({
  imports: [StorageModule],
  providers: [PdfEngineClient, PdfEngineService],
  exports: [PdfEngineService],
})
export class PdfEngineModule {}
