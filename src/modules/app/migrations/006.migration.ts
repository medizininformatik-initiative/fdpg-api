import { Model } from 'mongoose';
import { DataPrivacyConfigDocument } from 'src/modules/admin/schema/data-privacy/data-privacy-config.schema';
import { ProposalDocument } from 'src/modules/proposal/schema/proposal.schema';
import { IDbMigration } from '../types/db-migration.interface';
import { dataPrivacySeedMii } from './constants/006.migration.constants';

export class Migration006 implements IDbMigration {
  constructor(
    private proposalModel: Model<ProposalDocument>,
    private dataPrivacyConfigModel: Model<DataPrivacyConfigDocument>,
  ) {}

  private async seedDataPrivacyConfig() {
    console.log('Seeding Terms And Conditions for Platform MII...');
    const model = new this.dataPrivacyConfigModel(dataPrivacySeedMii);
    await model.save();
  }

  async up(migrationVersion: number) {
    await this.seedDataPrivacyConfig();
    const query = this.proposalModel.find({ migrationError: { $exists: false } });
    for await (const proposal of query) {
      try {
        const currentTypeOfUseUsage = proposal.userProject.typeOfUse.usage;

        if (!Array.isArray(currentTypeOfUseUsage)) {
          proposal.userProject.typeOfUse.usage = [currentTypeOfUseUsage];
        }

        proposal.migrationVersion = migrationVersion;
        proposal.migrationError = undefined;

        await proposal.save();
      } catch (error) {
        const proposalId = proposal._id.toString();
        const stringifiedError = JSON.stringify(error);
        console.log(
          `Migration${migrationVersion
            .toString()
            .padStart(3, '0')}: Error migrating proposal with id ${proposalId}. Error: ${stringifiedError}`,
        );

        try {
          const cleanDocument = await this.proposalModel.findById(proposalId);
          cleanDocument.migrationError = stringifiedError;
          await cleanDocument.save({ validateBeforeSave: false });
        } catch (error) {
          const stringifiedErrorCleanDocument = JSON.stringify(error);
          console.log(
            `Migration${migrationVersion
              .toString()
              .padStart(
                3,
                '0',
              )}: Error migrating proposal with id ${proposalId} while setting migrationError. Error: ${stringifiedErrorCleanDocument}`,
          );
        }
      }
    }
  }

  async down() {
    // Nothing to do here
  }
}
