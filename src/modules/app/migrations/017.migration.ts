import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IDbMigration } from '../types/db-migration.interface';
import { Proposal } from '../../proposal/schema/proposal.schema';
import { PlatformIdentifier } from '../../admin/enums/platform-identifier.enum';

@Injectable()
export class Migration017 implements IDbMigration {
  constructor(@InjectModel(Proposal.name) private proposalModel: Model<Proposal>) {}

  async up(): Promise<void> {
    console.log('Starting migration 017: Ensure proposals have MII in selectedDataSources');
    try {
      // Match proposals where selectedDataSources is missing, null, or empty array
      const filter = {
        $or: [
          { selectedDataSources: { $exists: false } },
          { selectedDataSources: { $eq: null } },
          { selectedDataSources: { $size: 0 } },
        ],
      } as any;

      const update = {
        $set: { selectedDataSources: [PlatformIdentifier.Mii] },
      };

      const result = await this.proposalModel.collection.updateMany(filter, update);
      console.log(`Migration 017 updated ${result.modifiedCount ?? 0} proposals`);
    } catch (error) {
      console.error('Error in migration 017:', error);
      throw error;
    }
  }

  async down(): Promise<void> {
    console.log('Down migration for 017 is not implemented');
  }
}
