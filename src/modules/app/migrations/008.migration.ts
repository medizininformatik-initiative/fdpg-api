import { Model } from 'mongoose';
import { IDbMigration } from '../types/db-migration.interface';
import { Proposal } from 'src/modules/proposal/schema/proposal.schema';
import { ProposalForm } from 'src/modules/proposal-form/schema/proposal-form.schema';
import { ProposalFormService } from 'src/modules/proposal-form/proposal-form.service';

export class Migration008 implements IDbMigration {
  constructor(
    private proposalModel: Model<Proposal>,
    private proposalFormModel: Model<ProposalForm>,
    private proposalFormService: ProposalFormService,
  ) {}

  async up() {
    console.log('Running migration 008: Update proposal to include proposal form version');

    await this.createEmptyProposalFormVersion(1);
    const mostCurrentVersion = await this.proposalFormService.getCurrentVersion();
    await this.updateProposalsToVersion(mostCurrentVersion);
    // await this.createEmptyProposalFormVersion(2);

    console.log('Finished migration 008.');
  }

  async updateProposalsToVersion(mostCurrentVersion: number): Promise<void> {
    try {
      const proposals = await this.proposalModel.find({}).exec();
      let updatedCount = 0;
      let count = 0;

      console.log(
        `Number of proposals to migrate '${proposals.length}' to proposalFormVersion '${mostCurrentVersion}'`,
      );

      const failedProposalsToMigrate = [];

      for (const proposal of proposals) {
        try {
          proposal.formVersion = mostCurrentVersion;

          await proposal.save();
          updatedCount++;
        } catch (error) {
          console.error('Error during setting proposal form version:', error);
          failedProposalsToMigrate.push(
            `{ id: ${proposal._id}, projectAbbr: ${proposal.projectAbbreviation}, error: ${error} }`,
          );
        }

        count++;

        if (count % 10 === 0) {
          console.log(`Migration progress ${count} / ${proposals.length} `);
        }
      }

      console.log(`Migration completed: ${updatedCount} proposal form version was set to '${mostCurrentVersion}'`);
      console.log(
        `Failed proposal ids to migrate: [${failedProposalsToMigrate.reduce((acc, curr) => acc + ', ' + curr, '')}]`,
      );
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  async createEmptyProposalFormVersion(version: number): Promise<void> {
    try {
      console.log(`Creating Proposal Form with version '${version}'`);
      await this.proposalFormModel.create({ formVersion: version, formSchema: {} });
      console.log(`Created Proposal Form with version '${version}'`);
    } catch (error) {
      console.error(`Creating proposal form version '${version}' failed: `, error);
      throw error;
    }
  }

  async down() {
    console.log('Down migration not implemented for setting proposal form version');
  }
}
