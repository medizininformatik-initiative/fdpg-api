import { NotFoundException } from '@nestjs/common';
import { LocationService } from '../service/location.service';

export const validateLocations = async (locationService: LocationService, locationIds: string[]) => [
  await Promise.all(locationIds.map(async (locationId) => await validateLocation(locationService, locationId))),
];

export const validateLocation = async (locationService: LocationService, locationId: string) => {
  const result = (await locationService.findAllLookUpMap())[locationId];

  if (!result) {
    throw new NotFoundException(`Could not find location '${locationId}'`);
  }
};
