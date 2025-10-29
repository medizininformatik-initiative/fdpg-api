import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';
import { IDbMigration } from '../types/db-migration.interface';
import { Proposal, ProposalDocument } from 'src/modules/proposal/schema/proposal.schema';
import { Comment, CommentDocument } from 'src/modules/comment/schema/comment.schema';
import { ALL_LOCATIONS } from './constants/019.migration.constants';

@Injectable()
export class Migration020 implements IDbMigration {
  constructor(
    @InjectModel(Proposal.name)
    private proposalModel: Model<ProposalDocument>,
    @InjectModel(Comment.name)
    private commentModel: Model<CommentDocument>,
  ) {}

  async up(): Promise<void> {
    console.log('Migration 020: replacing VIRTUAL_ALL entries');

    // Start a new session for the transaction
    const session: ClientSession = await this.proposalModel.db.startSession();
    session.startTransaction();

    try {
      // PROPOSAL START
      const proposalFilter = {
        'userProject.addressees.desiredLocations': 'VIRTUAL_ALL',
      };

      const proposalUpdateOperation = {
        $set: {
          'userProject.addressees.desiredLocations': [...ALL_LOCATIONS],
        },
      };

      const updateResult = await this.proposalModel.updateMany(proposalFilter, proposalUpdateOperation, { session });
      console.log(`Updated ${updateResult.modifiedCount} proposals.`);
      // PROPOSAL END

      // COMMENT LOCATION START
      const commentLocationFilter = {
        locations: 'VIRTUAL_ALL',
      };

      const commentLocationOperation = {
        $set: {
          locations: [...ALL_LOCATIONS],
        },
      };

      const commentLocationUpdateResult = await this.commentModel.updateMany(
        commentLocationFilter,
        commentLocationOperation,
        { session },
      );

      console.log(`Updated ${commentLocationUpdateResult.modifiedCount} comment locations.`);
      // COMMENT LOCATION END

      // COMMENT ANSWER LOCATION START
      const commentAnswerLocationFilter = {
        'answers.locations': 'VIRTUAL_ALL',
      };

      const commentAnswerLocationOperation = {
        $set: {
          'answers.$[elem].locations': [...ALL_LOCATIONS],
        },
      };

      const options = {
        session,
        arrayFilters: [{ 'elem.locations': 'VIRTUAL_ALL' }],
      };

      const commentAnswerLocationUpdateResult = await this.commentModel.updateMany(
        commentAnswerLocationFilter,
        commentAnswerLocationOperation,
        options,
      );

      console.log(`Updated ${commentAnswerLocationUpdateResult.modifiedCount} comment answer locations.`);
      // COMMENT ANSWER LOCATION END

      // 4. Commit the transaction
      await session.commitTransaction();
      console.log('Migration 020: Successfully replaced VIRTUAL_ALL enties.');
    } catch (error) {
      await session.abortTransaction();

      console.error('Migration 020: Failed to replace VIRTUAL_ALL entrues');
      console.error('Error Message:', error.message);
      console.error('Stack Trace:', error.stack);

      throw error;
    } finally {
      await session.endSession();
    }
  }
}
