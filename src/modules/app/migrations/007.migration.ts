import { Model } from 'mongoose';
import { IDbMigration } from '../types/db-migration.interface';
import { ProposalDocument } from 'src/modules/proposal/schema/proposal.schema';
import { CHECKLIST_OPTIONS } from 'src/modules/proposal/dto/proposal/checklist.types';

export class Migration007 implements IDbMigration {
  constructor(private proposalModel: Model<ProposalDocument>) {}

  async up() {
    console.log('Running migration: Update proposal checklists to include TNZ option');
    try {
      const proposals = await this.proposalModel.find({}).exec();
      let updatedCount = 0;
      let count = 0;

      console.log(`Number of proposals to migrate '${proposals.length}'`);

      const failedProposalsToMigrate = [];

      for (const proposal of proposals) {
        try {
          if (!proposal.fdpgChecklist) continue;

          let updated = false;

          if (proposal.fdpgChecklist.checkListVerification) {
            this.updateChecklistItems(proposal.fdpgChecklist.checkListVerification);
            updated = true;
          }

          if (proposal.fdpgChecklist.projectProperties) {
            this.updateChecklistItems(proposal.fdpgChecklist.projectProperties);
            updated = true;
          }

          if (updated) {
            await proposal.save();
            updatedCount++;
          }
        } catch (error) {
          console.error('Error during checklist migration:', error);
          failedProposalsToMigrate.push(
            `{ id: ${proposal._id}, projectAbbr: ${proposal.projectAbbreviation}, error: ${error} }`,
          );
        }

        count++;

        if (count % 10 === 0) {
          console.log(`Migration progress ${count} / ${proposals.length} `);
        }
      }

      console.log(`Migration completed: ${updatedCount} proposal checklists updated to include TNZ option`);
      console.log(
        `Failed proposal ids to migrate: [${failedProposalsToMigrate.reduce((acc, curr) => acc + ', ' + curr, '')}]`,
      );
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  private updateChecklistItems(items: any[]) {
    for (const item of items) {
      if (
        (item.options &&
          item.options.length === 2 &&
          item.options.some((opt) => opt.optionValue === 'yes') &&
          item.options.some((opt) => opt.optionValue === 'no')) ||
        (item.options && item.options.length === 1 && item.options.some((opt) => opt.optionValue === 'yes'))
      ) {
        if (!item.options.some((opt) => opt.optionValue === 'TNZ')) {
          item.options = CHECKLIST_OPTIONS.YES_NO_TNZ;
        }
      }

      if (item.sublist && item.sublist.length > 0) {
        this.updateChecklistItems(item.sublist);
      }
    }
  }

  async down() {
    console.log('Down migration not implemented for checklist TNZ option');
  }
}
