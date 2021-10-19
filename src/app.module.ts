import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DbTestModule } from './db-test/db-test.module';
import { GlobalHeadersInterceptor } from './shared/interceptors/global-headers.interceptor';
import { AuthModule } from './auth/auth.module';
import { AuthTestModule } from './auth-test/auth-test.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get('MONGO_CONNECTION_STRING'),
        appName: 'api-backend',
      }),
      inject: [ConfigService],
    }),
    ServeStaticModule.forRoot({
      exclude: ['/api*'],
      rootPath: join(__dirname, '..', 'static-content'),
    }),
    DbTestModule,
    AuthModule,
    AuthTestModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: GlobalHeadersInterceptor,
    },
  ],
})
export class AppModule {}
