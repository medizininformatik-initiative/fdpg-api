import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MiiLocationService } from './mii-location.service';

@Module({
  imports: [ConfigModule],
  providers: [MiiLocationService],
  exports: [MiiLocationService],
})
export class MiiLocationModule {}
