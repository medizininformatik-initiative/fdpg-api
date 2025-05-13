import { Model } from 'mongoose';
import { IDbMigration } from '../types/db-migration.interface';
import { DataPrivacyConfigDocument } from 'src/modules/admin/schema/data-privacy/data-privacy-config.schema';
import { ConfigType } from 'src/modules/admin/enums/config-type.enum';
import { PlatformIdentifier } from 'src/modules/admin/enums/platform-identifier.enum';
import { DataPrivacySeedDife } from './constants/009.migration.constants';

export class Migration009 implements IDbMigration {
  constructor(private dataPrivacyConfigModel: Model<DataPrivacyConfigDocument>) {}

  async up() {
    console.log('Running migration 009: Update DIFE data privacy configuration');

    try {
      await this.dataPrivacyConfigModel.updateOne(
        { platform: PlatformIdentifier.DIFE },
        {
          $set: {
            ...DataPrivacySeedDife,
            type: ConfigType.DataPrivacy,
            updatedAt: new Date(),
          },
        },
        { upsert: true },
      );

      console.log('Successfully updated DIFE data privacy configuration');
    } catch (error) {
      console.error('Error updating DIFE data privacy configuration:', error);
      throw error;
    }
  }
}
