import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IDbMigration } from '../types/db-migration.interface';
import { Location, LocationDocument } from 'src/modules/location/schema/location.schema';
import { ALL_LOCATIONS, INACTIVE_LOCATIONS, MIGRATION_MII_LOCATIONS } from './constants/019.migration.constants';

@Injectable()
export class Migration019 implements IDbMigration {
  constructor(
    @InjectModel(Location.name)
    private readonly locationModel: Model<LocationDocument>,
  ) {}

  async up(): Promise<void> {
    console.log('Migration 019: inserting default locations');

    try {
      const allDefaultLocations: Location[] = ALL_LOCATIONS.map((code) => ({
        _id: code,
        externalCode: code,
        display: MIGRATION_MII_LOCATIONS[code].display,
        definition: MIGRATION_MII_LOCATIONS[code].definition,
        consortium: MIGRATION_MII_LOCATIONS[code].definition,
        contract: undefined,
        abbreviation: undefined,
        dataIntegrationCenter: false,
        dataManagementCenter: false,
        deprecated: INACTIVE_LOCATIONS.includes(code),
        deprecationDate: INACTIVE_LOCATIONS.includes(code) ? new Date() : undefined,
      }));

      await this.locationModel.insertMany(allDefaultLocations);

      console.log('Migration 019: Successfully inserted default locations.');
    } catch (error) {
      console.error('Migration 019: Failed to insert locations, transaction aborted.');
      console.error('Error Message:', error.message);
      console.error('Stack Trace:', error.stack);

      throw error;
    }
  }
}
