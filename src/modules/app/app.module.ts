import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { GlobalHeadersInterceptor } from '../../shared/interceptors/global-headers.interceptor';
import { AuthModule } from '../auth/auth.module';
import { CommentModule } from '../comment/comment.module';
import { UserModule } from '../user/user.module';
import { ProposalModule } from '../proposal/proposal.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { StorageModule } from '../storage/storage.module';
import { PdfEngineModule } from '../pdf-engine/pdf-engine.module';
import { ScheduleModule } from '@nestjs/schedule';
import { AdminModule } from '../admin/admin.module';
import { FeasibilityModule } from '../feasibility/feasibility.module';
import { MigrationService } from './migration.service';
import { Migration, MigrationSchema } from './schema/migration.schema';
import { TermsConfig, TermsConfigSchema } from '../admin/schema/terms/terms-config.schema';
import { Proposal, ProposalSchema } from '../proposal/schema/proposal.schema';
import { DataPrivacyConfig, DataPrivacyConfigSchema } from '../admin/schema/data-privacy/data-privacy-config.schema';
import { ProposalFormModule } from '../proposal-form/proposal-form.module';
import { ProposalForm, ProposalFormSchema } from '../proposal-form/schema/proposal-form.schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        return {
          uri: configService.get('MONGO_CONNECTION_STRING'),
          appName: 'api-backend',
        };
      },
      inject: [ConfigService],
    }),
    ServeStaticModule.forRoot({
      exclude: ['/api*'],
      rootPath: join(__dirname, '..', '..', '..', 'static-content'),
    }),
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      {
        name: Migration.name,
        schema: MigrationSchema,
      },
      {
        name: TermsConfig.name,
        schema: TermsConfigSchema,
      },
      {
        name: Proposal.name,
        schema: ProposalSchema,
      },
      {
        name: DataPrivacyConfig.name,
        schema: DataPrivacyConfigSchema,
      },
      { name: ProposalForm.name, schema: ProposalFormSchema },
    ]),

    /** Modules */

    AuthModule,
    AdminModule,
    ProposalModule,
    CommentModule,
    UserModule,
    StorageModule,
    PdfEngineModule,
    FeasibilityModule,
    ProposalFormModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    MigrationService,
    {
      provide: APP_INTERCEPTOR,
      useClass: GlobalHeadersInterceptor,
    },
  ],
})
export class AppModule {}
