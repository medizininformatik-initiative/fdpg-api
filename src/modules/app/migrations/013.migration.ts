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
    // This migration does not perform any operations. because it was created to handle a specific case that has already been resolved.
    console.log('Migration 013: No operation - skipping');
  }
}
