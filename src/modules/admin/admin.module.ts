import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AzureStorageModule } from '../azure-storage/azure-storage.module';
import { AdminConfigController } from './admin-config.controller';
import { AdminConfigService } from './admin-config.service';
import { TermsConfig, TermsConfigSchema } from './schema/terms/terms-config.schema';
import { DataPrivacyConfig, DataPrivacyConfigSchema } from './schema/data-privacy/data-privacy-config.schema';
import { SharedModule } from 'src/shared/shared.module';

@Module({
  imports: [
    AzureStorageModule,
    MongooseModule.forFeature([
      {
        name: TermsConfig.name,
        schema: TermsConfigSchema,
      },
      {
        name: DataPrivacyConfig.name,
        schema: DataPrivacyConfigSchema,
      },
    ]),
    SharedModule,
  ],
  controllers: [AdminConfigController],
  providers: [AdminConfigService],
  exports: [AdminConfigService],
})
export class AdminModule {}
