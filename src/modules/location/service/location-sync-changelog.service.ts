import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { LocationSyncChangelog, LocationSyncChangelogDocument } from '../schema/location-sync-changelog';
import { Model } from 'mongoose';
import { LocationSyncChangeLogStatus } from '../enum/location-sync-changelog-status.enum';
import { MiiCodesystemLocationDto } from '../dto/mii-codesystem-location.dto';
import { LocationDocument } from '../schema/location.schema';
import { LocationSyncChangelogStrategy } from '../enum/location-sync-changelog-strategy.enum';
import { LocationSyncChangelogGetDto } from '../dto/location-sync-changelog-get.dto';
import { plainToClass } from 'class-transformer';

@Injectable()
export class LocationSyncChangelogService {
  constructor(
    @InjectModel(LocationSyncChangelog.name)
    private locationSyncChangelogModel: Model<LocationSyncChangelogDocument>,
  ) {}

  async findAll(): Promise<LocationSyncChangelogGetDto[]> {
    return (await this.locationSyncChangelogModel.find({}))
      .map((model) => model.toObject())
      .map((obj) => plainToClass(LocationSyncChangelogGetDto, obj));
  }

  async findAllDocuments(): Promise<LocationSyncChangelogDocument[]> {
    return await this.locationSyncChangelogModel.find({});
  }

  async findAllByStatus(status: LocationSyncChangeLogStatus): Promise<LocationSyncChangelogDocument[]> {
    const all = await this.locationSyncChangelogModel.find({ status });
    return all;
  }

  async generateLocationSyncChangelogsFromApi(
    locationApiDtoLookUpMap: Map<string, MiiCodesystemLocationDto>,
    persisted: LocationDocument[],
  ) {
    const pendingChanges = (await this.findAllByStatus(LocationSyncChangeLogStatus.PENDING)).map((changeLog) =>
      changeLog.toObject(),
    );

    const persistedLookUpMap = persisted.reduce((accumulator, currentItem) => {
      accumulator[currentItem.id] = currentItem;

      return accumulator;
    }, {});

    const changeLogs = Array.from(locationApiDtoLookUpMap, ([initialCode, finalEntry]) =>
      this.buildChangelog(persistedLookUpMap, initialCode, finalEntry),
    )
      .filter((changelog) => !!changelog)
      .map((newChangelog) => this.updatePendingChangelogs(newChangelog, pendingChanges));

    await this.processChangeLogs(changeLogs);
  }

  private buildChangelog(
    persistedLookUpMap,
    initialCode: string,
    finalEntry: MiiCodesystemLocationDto,
  ): LocationSyncChangelog | undefined {
    const persisted: LocationDocument | undefined = persistedLookUpMap[initialCode];

    const isDeprecated = !!finalEntry.replacedBy || !!finalEntry.deprecationDate || finalEntry.status == 'deprecated';

    const doEqual =
      !!persisted &&
      persisted.externalCode === finalEntry.code &&
      persisted.display === finalEntry.display &&
      persisted.definition === finalEntry.definition &&
      persisted.consortium === finalEntry.consortium &&
      persisted.contract === finalEntry.contract &&
      persisted.abbreviation === finalEntry.abbreviation &&
      persisted.uri === finalEntry.uri &&
      persisted.dataIntegrationCenter === finalEntry.dic &&
      persisted.dataManagementCenter === finalEntry.dataManagement &&
      persisted.deprecated === isDeprecated;

    if (doEqual) {
      return undefined;
    }

    const strategy = (() => {
      if (!persisted?.deprecated && isDeprecated) {
        return LocationSyncChangelogStrategy.DEPRECATE;
      } else if (!!persisted && !doEqual) {
        return LocationSyncChangelogStrategy.UPDATE;
      } else {
        return LocationSyncChangelogStrategy.INSERT;
      }
    })();

    return {
      _id: undefined,
      created: new Date(),
      status: LocationSyncChangeLogStatus.PENDING,
      strategy: strategy,
      forCode: initialCode,
      statusSetBy: undefined,
      statusSetDate: undefined,
      oldLocationData: persisted,
      newLocationData: {
        _id: initialCode,
        externalCode: finalEntry.code,
        display: finalEntry.display,
        definition: finalEntry.definition,
        consortium: finalEntry.consortium,
        contract: finalEntry.contract,
        abbreviation: finalEntry.abbreviation,
        uri: finalEntry.uri,
        dataIntegrationCenter: finalEntry.dic,
        dataManagementCenter: finalEntry.dataManagement,
        deprecationDate: finalEntry.deprecationDate ? new Date(finalEntry.deprecationDate) : undefined,
        deprecated: isDeprecated,
      },
    } as LocationSyncChangelog;
  }

  private async processChangeLogs(changeLogs: LocationSyncChangelog[]) {
    const operations = changeLogs.map((log) => ({
      updateOne: { filter: { _id: log._id }, update: { $set: log }, upsert: true },
    }));

    try {
      if (operations.length === 0) {
        console.log('No changelogs to process.');
        return;
      }

      const result = await this.locationSyncChangelogModel.bulkWrite(operations);
      console.log('Bulk write successful:', result);
      return result;
    } catch (error) {
      console.error('Error during bulk write:', error);
      throw error;
    }
  }

  private updatePendingChangelogs(
    newChangelog: LocationSyncChangelog,
    pendingChangelogs: LocationSyncChangelog[],
  ): LocationSyncChangelog {
    const [currentPending] = pendingChangelogs.filter((pending) => pending.forCode === newChangelog.forCode);

    if (currentPending.status !== LocationSyncChangeLogStatus.PENDING) {
      throw Error(`Tried to update immutable Changelog for code ${currentPending.forCode}`);
    }

    if (currentPending) {
      return {
        ...currentPending,
        created: newChangelog.created,
        strategy: newChangelog.strategy,
        newLocationData: { ...newChangelog.newLocationData },
      };
    }

    return newChangelog;
  }
}
