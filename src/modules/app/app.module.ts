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
import { ProposalFormModule } from '../proposal-form/proposal-form.module';
import { LocationModule } from '../location/location.module';
import { Location, LocationSchema } from '../location/schema/location.schema';
import { FhirModule } from '../fhir/fhir.module';
import { LoggerModule } from 'nestjs-pino';
import { DataSourcesModule } from '../data-source/data-source.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env.local', '.env'] }),
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const enableTelemetry = configService.get<string>('ENABLE_TELEMETRY') === 'true';

        return {
          pinoHttp: {
            autoLogging: true,
            useLevelLabels: true,
            level: process.env.ENV === 'production' ? 'info' : 'debug',
            transport: {
              targets: [
                // 1. Console Output
                {
                  target: 'pino-pretty',
                  options: {
                    colorize: true,
                    singleLine: true,
                    levelFirst: true,
                    translateTime: "UTC:yyyy-mm-dd'T'HH:MM:ss'Z'",
                    ignore: 'pid,hostname,req,res,responseTime,context',
                    messageFormat: '{application} [{context}] {msg}',
                  },
                },
                // 2. Loki Output (for Grafana)
                ...(enableTelemetry
                  ? [
                      {
                        target: 'pino-loki',
                        options: {
                          host: configService.get('LOKI_CONNECTION_STRING', 'http://localhost:3100'),
                          labels: { application: 'FDPG-API_' + configService.get('ENV', 'local') },
                          batching: true,
                          interval: 5,
                        },
                      },
                    ]
                  : []),
              ],
            },
          },
        };
      },
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        return { uri: configService.get('MONGO_CONNECTION_STRING'), appName: 'api-backend' };
      },
      inject: [ConfigService],
    }),
    ServeStaticModule.forRoot({
      exclude: ['/api'],
      rootPath: join(__dirname, '..', '..', '..', 'static-content'),
    }),
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: Migration.name, schema: MigrationSchema },
      { name: Location.name, schema: LocationSchema },
    ]),

    /** Modules */
    LocationModule,
    DataSourcesModule,
    AuthModule,
    AdminModule,
    ProposalModule,
    CommentModule,
    UserModule,
    StorageModule,
    PdfEngineModule,
    FeasibilityModule,
    FhirModule,
    ProposalFormModule,
  ],
  controllers: [AppController],
  providers: [AppService, MigrationService, { provide: APP_INTERCEPTOR, useClass: GlobalHeadersInterceptor }],
})
export class AppModule {}
