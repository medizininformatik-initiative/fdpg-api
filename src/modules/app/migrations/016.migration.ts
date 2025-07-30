import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ObjectId } from 'mongodb';
import { IDbMigration } from '../types/db-migration.interface';
import { Proposal } from '../../proposal/schema/proposal.schema';

@Injectable()
export class Migration016 implements IDbMigration {
  constructor(@InjectModel(Proposal.name) private proposalModel: Model<Proposal>) {}

  async up(): Promise<void> {
    console.log('Starting migration 016: Migrating feasibility details data to cohorts details');
    try {
      const proposals = await this.proposalModel.collection
        .find({ 'userProject.feasibility': { $exists: true, $ne: null } })
        .toArray();

      console.log(`Found ${proposals.length} proposals with feasibility data to migrate`);

      for (const proposal of proposals) {
        const feasibility = proposal.userProject?.feasibility;

        if (feasibility?.details) {
          console.log(`Processing proposal ${proposal._id}`);

          // Get existing cohorts or create proper structure
          let cohorts = proposal.userProject.cohorts;

          // If cohorts doesn't exist, initialize with proper structure
          if (!cohorts) {
            cohorts = {
              selectedCohorts: [],
              details: null,
              isDone: false,
              _id: new ObjectId().toString(), // Ensure cohorts has an ID
            };
          }

          // Migrate feasibility details to cohorts details if it exists
          if (feasibility.details && !cohorts.details) {
            cohorts.details = feasibility.details;
            console.log(`Migrated feasibility details to cohorts for proposal ${proposal._id}`);
          }

          // Update the proposal with new cohorts structure
          const updateResult = await this.proposalModel.collection.updateOne(
            { _id: proposal._id },
            {
              $set: { 'userProject.cohorts': cohorts },
            },
          );

          console.log(`Update result for proposal ${proposal._id}:`, JSON.stringify(updateResult));

          // Verify the update
          const updatedProposal = await this.proposalModel.collection.findOne({ _id: proposal._id });
          console.log(`Verification for proposal ${proposal._id}:`, {
            hasDetails: !!updatedProposal.userProject?.cohorts?.details,
          });
        }
      }
      console.log('Migration 016 completed successfully');
    } catch (error) {
      console.error('Error in migration 016:', error);
      throw error;
    }
  }

  async down(): Promise<void> {
    console.log('Down migration for 016 is not implemented');
    // No down migration logic provided, as per the original code context
  }
}
