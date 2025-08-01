import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IDbMigration } from '../types/db-migration.interface';
import { Proposal } from '../../proposal/schema/proposal.schema';

@Injectable()
export class Migration014 implements IDbMigration {
  constructor(@InjectModel(Proposal.name) private proposalModel: Model<Proposal>) {}

  async up(): Promise<void> {
    console.log('Starting migration 014: Fixing nested selectedCohorts structure');
    try {
      const proposals = await this.proposalModel.collection
        .find({ 'userProject.cohorts.selectedCohorts.0.selectedCohorts': { $exists: true } })
        .toArray();

      console.log(`Found ${proposals.length} proposals with nested selectedCohorts`);

      for (const proposal of proposals) {
        if (
          proposal.userProject?.cohorts?.selectedCohorts?.[0]?.selectedCohorts !== undefined &&
          proposal.userProject.cohorts.selectedCohorts.length > 0
        ) {
          console.log(`Processing proposal ${proposal._id}`);

          // Backup existing cohorts under userProject._cohorts field
          const backupResult = await this.proposalModel.collection.updateOne(
            { _id: proposal._id },
            {
              $set: { 'userProject._cohorts': proposal.userProject.cohorts },
            },
          );
          console.log(`Backup result for proposal ${proposal._id}:`, backupResult);

          // Replace entire cohorts with the first element from selectedCohorts array
          const firstSelectedCohort = proposal.userProject.cohorts.selectedCohorts[0];

          console.log(`Replacing cohorts with selectedCohorts[0] in proposal ${proposal._id}`);

          const updateResult = await this.proposalModel.collection.updateOne(
            { _id: proposal._id },
            {
              $set: { 'userProject.cohorts': firstSelectedCohort },
            },
          );

          console.log(`Update result for proposal ${proposal._id}:`, updateResult);

          const updatedProposal = await this.proposalModel.collection.findOne({ _id: proposal._id });
          console.log(`Verification for proposal ${proposal._id}:`, {
            cohortStructure: typeof updatedProposal.userProject?.cohorts,
            hasSelectedCohorts: 'selectedCohorts' in (updatedProposal.userProject?.cohorts || {}),
            hasBackup: '_cohorts' in (updatedProposal.userProject || {}),
          });
        }
      }
      console.log('Migration 014 completed successfully');
    } catch (error) {
      console.error('Error in migration 014:', error);
      throw error;
    }
  }

  async down() {
    console.log('Down migration not implemented');
  }
}
