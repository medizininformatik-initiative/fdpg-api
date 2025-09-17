import { Get } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { ApiController } from 'src/shared/decorators/api-controller.decorator';
import { LocationSyncService } from './service/location-sync.service';

@ApiController('locations')
export class LocationController {
  constructor(private locationSyncService: LocationSyncService) {}

  @Get('/test')
  @ApiOperation({ summary: 'TEST ENDPOINT' })
  async getQueriesByUser(): Promise<void> {
    await this.locationSyncService.syncLocations();
  }
}
