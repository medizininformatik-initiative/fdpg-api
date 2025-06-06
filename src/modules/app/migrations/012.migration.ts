import { Model } from 'mongoose';
import { IDbMigration } from '../types/db-migration.interface';
import { ProposalDocument } from '../../proposal/schema/proposal.schema';

export class Migration012 implements IDbMigration {
  constructor(private readonly proposalModel: Model<ProposalDocument>) {}

  async up(): Promise<void> {
    console.log('Starting migration 012: Moving cohorts from proposal to userProject');
    try {
      // Use native MongoDB driver to find documents with cohorts
      const proposals = await this.proposalModel.collection.find({ cohorts: { $exists: true } }).toArray();
      console.log(`Found ${proposals.length} proposals with cohorts`);

      for (const proposal of proposals) {
        if (proposal.cohorts && proposal.cohorts.length > 0) {
          console.log(`Processing proposal ${proposal._id}`);

          // Move cohorts to userProject
          const updateResult = await this.proposalModel.collection.updateOne(
            { _id: proposal._id },
            {
              $set: { 'userProject.cohorts': proposal.cohorts },
              $unset: { cohorts: true },
            },
          );

          console.log(`Update result for proposal ${proposal._id}:`, updateResult);

          // Verify the update
          const updatedProposal = await this.proposalModel.collection.findOne({ _id: proposal._id });
          console.log(`Verification for proposal ${proposal._id}:`, {
            hasCohorts: 'cohorts' in updatedProposal,
            hasUserProjectCohorts: updatedProposal.userProject?.cohorts?.length > 0,
          });
        }
      }
      console.log('Migration 012 completed successfully');
    } catch (error) {
      console.error('Error in migration 012:', error);
      throw error;
    }
  }

  async down(): Promise<void> {
    console.log('Starting migration 012 down: Moving cohorts back to proposal from userProject');
    try {
      // Use native MongoDB driver to find documents with userProject.cohorts
      const proposals = await this.proposalModel.collection
        .find({ 'userProject.cohorts': { $exists: true } })
        .toArray();
      console.log(`Found ${proposals.length} proposals with cohorts in userProject`);

      for (const proposal of proposals) {
        if (proposal.userProject?.cohorts?.length > 0) {
          console.log(`Processing proposal ${proposal._id}`);

          // Move cohorts back to proposal
          const updateResult = await this.proposalModel.collection.updateOne(
            { _id: proposal._id },
            {
              $set: { cohorts: proposal.userProject.cohorts },
              $unset: { 'userProject.cohorts': '' },
            },
          );

          console.log(`Update result for proposal ${proposal._id}:`, updateResult);

          // Verify the update
          const updatedProposal = await this.proposalModel.collection.findOne({ _id: proposal._id });
          console.log(`Verification for proposal ${proposal._id}:`, {
            hasCohorts: 'cohorts' in updatedProposal,
            hasUserProjectCohorts: updatedProposal.userProject?.cohorts?.length > 0,
          });
        }
      }
      console.log('Migration 012 down completed successfully');
    } catch (error) {
      console.error('Error in migration 012 down:', error);
      throw error;
    }
  }
}
