import { Model } from 'mongoose';
import { IDbMigration } from '../types/db-migration.interface';
import { ProposalDocument } from 'src/modules/proposal/schema/proposal.schema';
import { BiosampleType } from 'src/modules/proposal/enums/biosample-type.enum';

export class Migration011 implements IDbMigration {
  constructor(private proposalModel: Model<ProposalDocument>) {}

  async up() {
    console.log('Running migration 011: Moving invalid biosample type values to typeDetails');

    try {
      // Find all proposals that have biosamples
      const proposals = await this.proposalModel.find({
        'userProject.informationOnRequestedBioSamples.biosamples': { $exists: true },
      });

      for (const proposal of proposals) {
        const biosamples = proposal.userProject?.informationOnRequestedBioSamples?.biosamples || [];
        let hasChanges = false;

        for (const biosample of biosamples) {
          // Check if type is a string but not a valid BiosampleType
          if (
            typeof biosample.type === 'string' &&
            !Object.values(BiosampleType).includes(biosample.type as BiosampleType)
          ) {
            // Move the invalid type to typeDetails
            biosample.typeDetails = biosample.type;
            // Set type to null since it's invalid
            biosample.type = null;
            hasChanges = true;
          }
        }

        if (hasChanges) {
          await proposal.save();
        }
      }

      console.log('Successfully completed migration 011');
    } catch (error) {
      console.error('Error in migration 011:', error);
      throw error;
    }
  }

  async down() {
    console.log('Running migration 011 down: Reverting biosample type changes');
    // Note: We cannot reliably revert this migration as we don't store the original type values
    console.log('Migration 011 down is not supported');
  }
}
