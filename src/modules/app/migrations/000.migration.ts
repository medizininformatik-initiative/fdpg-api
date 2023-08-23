import { Model } from 'mongoose';
import { MigrationDocument } from '../schema/migration.schema';
import { IDbMigration } from '../types/db-migration.interface';
import { TermsConfigDocument } from 'src/modules/admin/schema/terms/terms-config.schema';
import { termsAndConditionsSeedMii } from './constants/001.migration.constants';
import { DataPrivacyConfigDocument } from 'src/modules/admin/schema/data-privacy/data-privacy-config.schema';
import { dataPrivacySeedMii } from './constants/006.migration.constants';

export class Migration000 implements IDbMigration {
  constructor(
    private migrationModel: Model<MigrationDocument>,
    private termsConfigModel: Model<TermsConfigDocument>,
    private dataPrivacyConfigModel: Model<DataPrivacyConfigDocument>,
  ) {}

  private async setUpInitialMigrationModel() {
    console.log('Setup Initial DB Migration');
    const model = new this.migrationModel();
    model.updatedAt = new Date();
    await model.save({ validateBeforeSave: false });
  }

  private async seedDataPrivacyConfig() {
    console.log('Seeding Data Privacy for Platform MII...');
    const model = new this.dataPrivacyConfigModel(dataPrivacySeedMii);
    await model.save({ validateBeforeSave: false });
  }

  private async seedTermsAndConditions() {
    console.log('Seeding Terms And Conditions for Platform MII...');
    const secondModel = new this.termsConfigModel(termsAndConditionsSeedMii);
    await secondModel.save({ validateBeforeSave: false });
  }

  async up() {
    await this.setUpInitialMigrationModel();
    await this.seedTermsAndConditions();
    await this.seedDataPrivacyConfig();
  }
}
