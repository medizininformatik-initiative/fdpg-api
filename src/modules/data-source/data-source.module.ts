import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Nfdi4HealthClient } from './client/nfdi4health.client';
import { Nfdi4HealthService } from './service/nfdi4health.service';
import { DataSourceCrudService } from './service/data-source-crud.service';
import { Nfdi4HealthSyncService } from './service/nfdi4health-sync.service';
import { DataSource, DataSourceSchema } from './schema/data-source.schema';

@Module({
  imports: [CacheModule.register(), MongooseModule.forFeature([{ name: DataSource.name, schema: DataSourceSchema }])],
  providers: [Nfdi4HealthClient, Nfdi4HealthService, DataSourceCrudService, Nfdi4HealthSyncService],
  exports: [],
  controllers: [],
})
export class DataSourcesModule {}
