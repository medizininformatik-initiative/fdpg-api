import { Get } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { ApiController } from 'src/shared/decorators/api-controller.decorator';
import { LocationSyncService } from './service/location-sync.service';
import { LocationService } from './service/location.service';
import { LocationGetDto } from './dto/location-get.dto';
import { LocationSyncChangelogGetDto } from './dto/location-sync-changelog-get.dto';
import { LocationSyncChangelogService } from './service/location-sync-changelog.service';

@ApiController('locations')
export class LocationController {
  constructor(
    private locationSyncService: LocationSyncService,
    private locationService: LocationService,
    private locationSyncChangelogService: LocationSyncChangelogService,
  ) {}

  @Get('/test')
  @ApiOperation({ summary: 'TEST ENDPOINT' })
  async getQueriesByUser(): Promise<void> {
    await this.locationSyncService.syncLocations();
  }

  @Get()
  async getAll(): Promise<LocationGetDto[]> {
    return await this.locationService.findAll();
  }

  @Get('/changelogs')
  async getAllChangeLogs(): Promise<LocationSyncChangelogGetDto[]> {
    return await this.locationSyncChangelogService.findAll();
  }
}
