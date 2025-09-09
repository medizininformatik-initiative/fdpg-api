import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { MiiLocationService } from './mii-location.service';

@Module({
  imports: [ConfigModule, CacheModule.register()],
  providers: [MiiLocationService],
  exports: [MiiLocationService],
})
export class MiiLocationModule {}
