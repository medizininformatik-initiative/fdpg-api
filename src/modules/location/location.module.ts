import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Location, LocationSchema } from './schema/location.schema';
import { MiiCodesystemClient } from './client/mii-codesystem.client';
import { LocationFetchService } from './service/location-fetch.service';
import { LocationSyncService } from './service/location-sync.service';
import { LocationController } from './location.controller';
import { LocationService } from './service/location.service';
import { LocationSyncChangelog, LocationSyncChangelogSchema } from './schema/location-sync-changelog.schema';
import { LocationSyncChangelogService } from './service/location-sync-changelog.service';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Location.name, schema: LocationSchema },
      { name: LocationSyncChangelog.name, schema: LocationSyncChangelogSchema },
    ]),
    CacheModule.register(),
  ],
  providers: [
    MiiCodesystemClient,
    LocationFetchService,
    LocationSyncService,
    LocationService,
    LocationSyncChangelogService,
  ],
  exports: [LocationService, LocationSyncService, MongooseModule],
  controllers: [LocationController],
})
export class LocationModule {}
