import { Injectable } from '@nestjs/common';
import { LocationFetchService } from './location-fetch.service';
import { LocationService } from './location.service';

@Injectable()
export class LocationSyncService {
  constructor(
    private locationFetchService: LocationFetchService,
    private locationSevice: LocationService,
  ) {}

  async syncLocations(): Promise<void> {
    const allPersisted = await this.locationSevice.findAll();
    const allApiDtos = await this.locationFetchService.fetchLocationsFromApi();

    console.log({ allPersisted, allApiDtos });
  }
}
