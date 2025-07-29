import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ObjectId } from 'mongodb';
import { IDbMigration } from '../types/db-migration.interface';
import { Proposal } from '../../proposal/schema/proposal.schema';

@Injectable()
export class Migration015 implements IDbMigration {
  constructor(@InjectModel(Proposal.name) private proposalModel: Model<Proposal>) {}

  async up(): Promise<void> {
    console.log('Starting migration 015: Migrating feasibility data to cohorts');
    try {
      const proposals = await this.proposalModel.collection
        .find({ 'userProject.feasibility': { $exists: true, $ne: null } })
        .toArray();

      console.log(`Found ${proposals.length} proposals with feasibility data to migrate`);

      for (const proposal of proposals) {
        const feasibility = proposal.userProject?.feasibility;

        if (feasibility?.id) {
          console.log(`Processing proposal ${proposal._id}`);

          // Get existing cohorts or create proper structure
          let cohorts = proposal.userProject.cohorts;

          // If cohorts doesn't exist, initialize with proper structure
          if (!cohorts) {
            cohorts = {
              selectedCohorts: [],
              details: null,
              isDone: false,
            };
          }

          // Ensure selectedCohorts array exists
          if (!cohorts.selectedCohorts) {
            cohorts.selectedCohorts = [];
          }

          // Check if this feasibility ID is already migrated
          const existingCohort = cohorts.selectedCohorts.find((cohort) => cohort.feasibilityQueryId === feasibility.id);

          if (!existingCohort) {
            cohorts.selectedCohorts.push({
              _id: new ObjectId().toString(),
              feasibilityQueryId: feasibility.id,
              label: 'Machbarkeits-Anfrage',
              isManualUpload: false,
            });

            console.log(`Added feasibility ID ${feasibility.id} to selectedCohorts for proposal ${proposal._id}`);
          } else {
            console.log(
              `Feasibility ID ${feasibility.id} already exists in selectedCohorts for proposal ${proposal._id}`,
            );
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
            selectedCohortsCount: updatedProposal.userProject?.cohorts?.selectedCohorts?.length || 0,
            hasDetails: !!updatedProposal.userProject?.cohorts?.details,
            hasIsDone: 'isDone' in (updatedProposal.userProject?.cohorts || {}),
            feasibilityStillExists: !!updatedProposal.userProject?.feasibility,
          });
        }
      }
      console.log('Migration 015 completed successfully');
    } catch (error) {
      console.error('Error in migration 015:', error);
      throw error;
    }
  }

  async down(): Promise<void> {
    console.log('Down migration for 015 is not implemented');
    // No down migration logic provided, as per the original code context
  }
}
