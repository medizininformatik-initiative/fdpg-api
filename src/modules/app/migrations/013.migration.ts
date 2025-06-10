import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IDbMigration } from '../types/db-migration.interface';
import { Proposal, ProposalDocument } from 'src/modules/proposal/schema/proposal.schema';

@Injectable()
export class Migration013 implements IDbMigration {
  constructor(
    @InjectModel(Proposal.name)
    private readonly proposalModel: Model<ProposalDocument>,
  ) {}

  async up(): Promise<void> {
    console.log('Starting migration 013: Updating cohort schema structure');
    try {
      // Find all proposals that have cohorts
      const proposals = await this.proposalModel.collection
        .find({ 'userProject.cohorts': { $exists: true } })
        .toArray();
      console.log(`Found ${proposals.length} proposals with cohorts`);

      for (const proposal of proposals) {
        if (proposal.userProject?.cohorts) {
          console.log(`Processing proposal ${proposal._id}`);

          // Transform the old cohort structure to the new one
          const oldCohorts = proposal.userProject.cohorts;
          const newCohorts = {
            selectedCohorts: Array.isArray(oldCohorts) ? oldCohorts : [oldCohorts],
          };

          // Update the proposal with the new cohort structure
          const updateResult = await this.proposalModel.collection.updateOne(
            { _id: proposal._id },
            {
              $set: { 'userProject.cohorts': newCohorts },
            },
          );

          console.log(`Update result for proposal ${proposal._id}:`, updateResult);

          // Verify the update
          const updatedProposal = await this.proposalModel.collection.findOne({ _id: proposal._id });
          console.log(`Verification for proposal ${proposal._id}:`, {
            hasCohorts: 'userProject.cohorts' in updatedProposal,
            hasSelectedCohorts: updatedProposal.userProject?.cohorts?.selectedCohorts?.length > 0,
          });
        }
      }
      console.log('Migration 013 completed successfully');
    } catch (error) {
      console.error('Error in migration 013:', error);
      throw error;
    }
  }

  async down(): Promise<void> {
    console.log('Starting migration 013 down: Reverting cohort schema structure');
    try {
      // Find all proposals that have the new cohort structure
      const proposals = await this.proposalModel.collection
        .find({ 'userProject.cohorts.selectedCohorts': { $exists: true } })
        .toArray();
      console.log(`Found ${proposals.length} proposals with new cohort structure`);

      for (const proposal of proposals) {
        if (proposal.userProject?.cohorts?.selectedCohorts) {
          console.log(`Processing proposal ${proposal._id}`);

          // Transform the new cohort structure back to the old one
          const newCohorts = proposal.userProject.cohorts.selectedCohorts;
          const oldCohorts = newCohorts.length === 1 ? newCohorts[0] : newCohorts;

          // Update the proposal with the old cohort structure
          const updateResult = await this.proposalModel.collection.updateOne(
            { _id: proposal._id },
            {
              $set: { 'userProject.cohorts': oldCohorts },
            },
          );

          console.log(`Update result for proposal ${proposal._id}:`, updateResult);

          // Verify the update
          const updatedProposal = await this.proposalModel.collection.findOne({ _id: proposal._id });
          console.log(`Verification for proposal ${proposal._id}:`, {
            hasCohorts: 'userProject.cohorts' in updatedProposal,
            hasSelectedCohorts: !('selectedCohorts' in (updatedProposal.userProject?.cohorts || {})),
          });
        }
      }
      console.log('Migration 013 down completed successfully');
    } catch (error) {
      console.error('Error in migration 013 down:', error);
      throw error;
    }
  }
}
