import { Model } from 'mongoose';
import { ProposalDocument } from 'src/modules/proposal/schema/proposal.schema';
import { IDbMigration } from '../types/db-migration.interface';
import { DirectUpload } from 'src/modules/proposal/enums/upload-type.enum';

export class Migration005 implements IDbMigration {
  constructor(private proposalModel: Model<ProposalDocument>) {}

  async up(migrationVersion: number) {
    const query = this.proposalModel.find({ migrationError: { $exists: false } });
    for await (const proposal of query) {
      try {
        const isExisting = proposal.userProject.ethicVote.isExisting;
        const hasExistingAttachment = proposal.uploads.find(attachment => attachment.type === DirectUpload.EthicVote)

        if (isExisting && hasExistingAttachment) {
          proposal.userProject.ethicVote.admitReputationOfAttachment= true;
        } else {
          proposal.userProject.ethicVote.admitReputationOfAttachment= false;
        }
        const perviousEthicVote = JSON.parse(JSON.stringify(proposal.userProject.ethicVote))
        delete perviousEthicVote.isNotExistingReason
        proposal.userProject.ethicVote = perviousEthicVote
        proposal.migrationVersion = migrationVersion;
        proposal.migrationError = undefined;

        await proposal.save({ validateBeforeSave: false });
      } catch (error) {
        const proposalId = proposal._id.toString();
        const stringifiedError = JSON.stringify(error);
        console.log(`Migration005: Error migrating proposal with id ${proposalId}. Error: ${stringifiedError}`);

        try {
          const cleanDocument = await this.proposalModel.findById(proposalId);
          cleanDocument.migrationError = stringifiedError;
          await cleanDocument.save({ validateBeforeSave: false });
        } catch (error) {
          const stringifiedErrorCleanDocument = JSON.stringify(error);
          console.log(
            `Migration005: Error migrating proposal with id ${proposalId} while setting migrationError. Error: ${stringifiedErrorCleanDocument}`,
          );
        }
      }
    }
  }

  async down() {
    // Nothing to do here
  }
}
