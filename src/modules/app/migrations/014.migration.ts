import { Model } from 'mongoose';
import { IDbMigration } from '../types/db-migration.interface';
import { DataPrivacyConfigDocument } from 'src/modules/admin/schema/data-privacy/data-privacy-config.schema';
import { ConfigType } from 'src/modules/admin/enums/config-type.enum';
import { PlatformIdentifier } from 'src/modules/admin/enums/platform-identifier.enum';
import { DataPrivacySeedDife, dataPrivacySeedMii } from './constants/014.migration.constants';

export class Migration014 implements IDbMigration {
  constructor(private dataPrivacyConfigModel: Model<DataPrivacyConfigDocument>) {}

  async up() {
    console.log('Running migration 014: Update DIFE data privacy configuration');

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

      await this.dataPrivacyConfigModel.updateOne(
        { platform: PlatformIdentifier.Mii },
        {
          $set: {
            ...dataPrivacySeedMii,
            type: ConfigType.DataPrivacy,
            updatedAt: new Date(),
          },
        },
        { upsert: true },
      );

      console.log('Successfully updated MII and DIFE data privacy configuration');
    } catch (error) {
      console.error('Error updating MII and DIFE data privacy configuration:', error);
      throw error;
    }
  }

  async down() {
    console.log('Running migration 014 down: Reverting MII and DIFE data privacy configuration');

    try {
      await this.dataPrivacyConfigModel.deleteOne({ platform: PlatformIdentifier.DIFE });
      await this.dataPrivacyConfigModel.deleteOne({ platform: PlatformIdentifier.Mii });
      console.log('Successfully reverted MII and DIFE data privacy configuration');
    } catch (error) {
      console.error('Error reverting MII and DIFE data privacy configuration:', error);
      throw error;
    }
  }
}
