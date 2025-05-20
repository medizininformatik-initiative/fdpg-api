import { Model } from 'mongoose';
import { IDbMigration } from '../types/db-migration.interface';
import { Proposal } from 'src/modules/proposal/schema/proposal.schema';

export class Migration010 implements IDbMigration {
  constructor(private proposalModel: Model<Proposal>) {}

  async up() {
    console.log('Running migration 010: Converting internalCheckNotes from object to string');

    try {
      // First, update all documents where fdpgInternalCheckNotes is an object to extract just the note
      const result = await this.proposalModel.updateMany(
        { 'fdpgChecklist.fdpgInternalCheckNotes': { $type: 'object' } },
        [
          {
            $set: {
              'fdpgChecklist.fdpgInternalCheckNotes': {
                $cond: {
                  if: { $eq: [{ $type: '$fdpgChecklist.fdpgInternalCheckNotes.note' }, 'string'] },
                  then: '$fdpgChecklist.fdpgInternalCheckNotes.note',
                  else: '',
                },
              },
            },
          },
        ],
      );

      console.log(`Successfully updated ${result.modifiedCount} proposals`);
    } catch (error) {
      console.error('Error updating internalCheckNotes:', error);
      throw error;
    }
  }

  async down() {
    console.log('Running migration 010 down: Reverting internalCheckNotes changes');
    // No down migration needed as we're converting to a simpler type
  }
}

export default Migration010;
