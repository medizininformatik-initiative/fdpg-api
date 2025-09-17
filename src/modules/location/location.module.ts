import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Location, LocationSchema } from './schema/location.schema';
import { MiiCodesystemClient } from './client/mii-codesystem.client';
import { LocationFetchService } from './service/location-fetch.service';
import { LocationSyncService } from './service/location-sync.service';
import { LocationController } from './location.controller';
import { LocationService } from './service/location.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Location.name, schema: LocationSchema }])],
  providers: [MiiCodesystemClient, LocationFetchService, LocationSyncService, LocationService],
  exports: [LocationService, LocationSyncService],
  controllers: [LocationController],
})
export class LocationModule {}
