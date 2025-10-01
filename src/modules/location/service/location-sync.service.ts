import { ForbiddenException, Injectable } from '@nestjs/common';
import { LocationFetchService } from './location-fetch.service';
import { LocationService } from './location.service';
import { MiiCodesystemLocationDto } from '../dto/mii-codesystem-location.dto';
import { LocationSyncChangelogService } from './location-sync-changelog.service';
import { LocationSyncChangelogDto } from '../dto/location-sync-changelog.dto';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import { Role } from 'src/shared/enums/role.enum';
import { LocationSyncChangeLogStatus } from '../enum/location-sync-changelog-status.enum';

@Injectable()
export class LocationSyncService {
  constructor(
    private locationFetchService: LocationFetchService,
    private locationSevice: LocationService,
    private locationSyncChangelogService: LocationSyncChangelogService,
  ) {}

  async syncLocations(): Promise<void> {
    const allPersisted = await this.locationSevice.findAllDocuments();
    const allApiDtos = (await this.locationFetchService.fetchLocationsFromApi()).filter((apiLoc) => apiLoc.code);

    const locationDtoLookUpMap = this.getVersionChainMap(allApiDtos);

    await this.locationSyncChangelogService.generateLocationSyncChangelogsFromApi(locationDtoLookUpMap, allPersisted);
  }

  async setChangelogStatus(
    changelogId: string,
    changelog: LocationSyncChangelogDto,
    user: IRequestUser,
  ): Promise<LocationSyncChangelogDto> {
    if (user.singleKnownRole !== Role.FdpgMember) {
      throw new ForbiddenException('Only FDPG Members can change the status of changelogs');
    }
    const updatedChangelog = await this.locationSyncChangelogService.updateStatus(changelogId, changelog, user);

    if (updatedChangelog.status === LocationSyncChangeLogStatus.APPROVED) {
      await this.locationSevice.update(updatedChangelog.forCode, changelog.newLocationData);
    }

    return this.locationSyncChangelogService.modelToDto(updatedChangelog);
  }

  /**
   * Processes an array of entries to find the start and end of each version chain.
   *
   * @param {Entry[]} entries - An array of entry objects.
   * @returns {Map<string, Entry>} A map where the key is the code of the initial entry
   * in a chain, and the value is the most recent (final) entry object in that chain.
   */
  private getVersionChainMap(entries: MiiCodesystemLocationDto[]): Map<string, MiiCodesystemLocationDto> {
    // The final map we will return.
    const chainMap = new Map();

    // A helper map for O(1) lookup of any entry by its code. This is key to performance.
    const codeToEntryMap = new Map(entries.map((entry) => [entry.code, entry]));

    // A set to keep track of entries that have already been processed as part of a chain.
    const processedCodes = new Set();

    for (const entry of entries) {
      // If we have already processed this entry as part of another chain, skip it.
      if (processedCodes.has(entry.code)) {
        continue;
      }

      // 1. Find the beginning of the chain.
      // We traverse backwards using the `replaces` property until we find an entry
      // that doesn't replace anything.
      let initialEntry = entry;
      while (initialEntry.replaces && codeToEntryMap.has(initialEntry.replaces)) {
        initialEntry = codeToEntryMap.get(initialEntry.replaces);
      }

      // 2. Find the end of the chain.
      // From the known beginning, we traverse forwards using `replacedBy` to find
      // the most recent entry.
      let finalEntry = initialEntry;
      while (finalEntry.replacedBy && codeToEntryMap.has(finalEntry.replacedBy)) {
        // Mark each entry along the way as processed so we don't re-calculate this chain.
        processedCodes.add(finalEntry.code);
        finalEntry = codeToEntryMap.get(finalEntry.replacedBy);
      }

      // Also mark the final entry as processed.
      processedCodes.add(finalEntry.code);

      // 3. Store the result.
      // The key is the first code, the value is the last entry object.
      chainMap.set(initialEntry.code, finalEntry);
    }

    return chainMap;
  }
}
