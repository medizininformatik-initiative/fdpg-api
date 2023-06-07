import { Model } from 'mongoose';
import { ConfigType } from 'src/modules/admin/enums/config-type.enum';
import { PlatformIdentifier } from 'src/modules/admin/enums/platform-identifier.enum';
import { TermsConfigDocument } from 'src/modules/admin/schema/terms/terms-config.schema';
import { IDbMigration } from '../types/db-migration.interface';
import { termsAndConditionsSeedMii } from './constants/001.migration.constants';

export class Migration001 implements IDbMigration {
  constructor(private termsConfigModel: Model<TermsConfigDocument>) {}

  async up() {
    console.log('Seeding Terms And Conditions for Platform MII...');
    const model = new this.termsConfigModel(termsAndConditionsSeedMii);
    await model.save();
  }

  async down() {
    console.log('Removing Terms And Conditions Seed for Platform MII...');
    const model = await this.termsConfigModel.findOne({
      platform: PlatformIdentifier.Mii,
      type: ConfigType.TermsDialog,
    });
    if (model) {
      console.log(`Found config to delete with updated at: ${model.updatedAt}`);
      await model.deleteOne();
    } else {
      console.log('No config found');
    }
  }
}
