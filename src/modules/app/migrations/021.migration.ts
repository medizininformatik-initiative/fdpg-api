import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IDbMigration } from '../types/db-migration.interface';
import { Proposal, ProposalDocument } from '../../proposal/schema/proposal.schema';
import { ProposalType } from '../../proposal/enums/proposal-type.enum';

@Injectable()
export class Migration021 implements IDbMigration {
  constructor(@InjectModel(Proposal.name) private proposalModel: Model<ProposalDocument>) {}

  async up(): Promise<void> {
    console.log('Starting migration 021: Add type field to proposals');
    try {
      // Add type: ApplicationForm to all existing proposals that don't have a type field
      const filter = { type: { $exists: false } };
      const update = { $set: { type: ProposalType.ApplicationForm } };

      const result = await this.proposalModel.collection.updateMany(filter, update);
      console.log(`Migration 021: Added type field to ${result.modifiedCount ?? 0} proposals`);
    } catch (error) {
      console.error('Error in migration 021:', error);
      throw error;
    }
  }

  async down(): Promise<void> {
    console.log('Starting migration 021 rollback: Remove type field from proposals');
    try {
      // Remove type field from all proposals
      const filter = { type: { $exists: true } };
      const update = { $unset: { type: '' } };

      const result = await this.proposalModel.collection.updateMany(filter, update);
      console.log(`Migration 021 rollback: Removed type field from ${result.modifiedCount ?? 0} proposals`);
    } catch (error) {
      console.error('Error in migration 021 rollback:', error);
      throw error;
    }
  }
}
