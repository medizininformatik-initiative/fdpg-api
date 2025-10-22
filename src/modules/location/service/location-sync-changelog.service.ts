import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { LocationSyncChangelog, LocationSyncChangelogDocument } from '../schema/location-sync-changelog.schema';
import { Model } from 'mongoose';
import { LocationSyncChangeLogStatus } from '../enum/location-sync-changelog-status.enum';
import { MiiCodesystemLocationDto } from '../dto/mii-codesystem-location.dto';
import { LocationDocument } from '../schema/location.schema';
import { LocationSyncChangelogStrategy } from '../enum/location-sync-changelog-strategy.enum';
import { plainToClass } from 'class-transformer';
import { LocationSyncChangelogDto } from '../dto/location-sync-changelog.dto';
import { IRequestUser } from 'src/shared/types/request-user.interface';

@Injectable()
export class LocationSyncChangelogService {
  constructor(
    @InjectModel(LocationSyncChangelog.name)
    private locationSyncChangelogModel: Model<LocationSyncChangelogDocument>,
  ) {}

  async findById(id: string): Promise<LocationSyncChangelogDocument> {
    return await this.locationSyncChangelogModel.findById(id);
  }

  async findAll(): Promise<LocationSyncChangelogDto[]> {
    return (await this.findAllDocuments())
      .map((model) => model.toObject() as LocationSyncChangelog)
      .map((obj) => plainToClass(LocationSyncChangelogDto, obj));
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
    const pendingChanges = (await this.findAllByStatus(LocationSyncChangeLogStatus.PENDING)).map(
      (changeLog) => changeLog.toObject() as LocationSyncChangelog,
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

  async updateStatus(
    id: string,
    changelog: LocationSyncChangelogDto,
    user: IRequestUser,
  ): Promise<LocationSyncChangelog> {
    const doc = await this.findById(id);

    if (
      !(
        doc.status === LocationSyncChangeLogStatus.PENDING &&
        [LocationSyncChangeLogStatus.APPROVED, LocationSyncChangeLogStatus.DECLINED].includes(changelog.status)
      )
    ) {
      throw new ForbiddenException("Status can only be changed from 'PENDING' to 'ACCEPTED' or 'DECLINED'");
    }

    doc.status = changelog.status;
    doc.statusSetBy = user.userId;
    doc.statusSetDate = new Date();
    doc.updated = new Date();

    return await doc.save();
  }

  modelToDto(changelogDoc: LocationSyncChangelog): LocationSyncChangelogDto {
    return plainToClass(LocationSyncChangelogDto, changelogDoc);
  }

  private stringComparision(old?: string, updated?: string) {
    if (!old && !updated) {
      return true;
    }

    return old == updated;
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
      this.stringComparision(persisted.externalCode, finalEntry.code) &&
      this.stringComparision(persisted.display, finalEntry.display) &&
      this.stringComparision(persisted.definition, finalEntry.definition) &&
      this.stringComparision(persisted.consortium, finalEntry.consortium) &&
      this.stringComparision(persisted.contract, finalEntry.contract) &&
      this.stringComparision(persisted.abbreviation, finalEntry.abbreviation) &&
      this.stringComparision(persisted.uri, finalEntry.uri) &&
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
    const operations = [];

    for (const log of changeLogs) {
      if (log._id) {
        operations.push({
          updateOne: {
            filter: { _id: log._id },
            update: { $set: log },
            upsert: true,
          },
        });
      } else {
        const { ...docToInsert } = log;
        operations.push({
          insertOne: {
            document: docToInsert,
          },
        });
      }
    }

    try {
      if (operations.length === 0) {
        console.log('No changelogs to process.');
        return;
      }

      const result = await this.locationSyncChangelogModel.bulkWrite(operations);
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

    if (currentPending) {
      if (currentPending.status !== LocationSyncChangeLogStatus.PENDING) {
        throw Error(`Tried to update immutable Changelog for code ${currentPending.forCode}`);
      }

      return {
        ...currentPending,
        updated: new Date(),
        strategy: newChangelog.strategy,
        newLocationData: { ...newChangelog.newLocationData },
      };
    }

    return newChangelog;
  }
}
