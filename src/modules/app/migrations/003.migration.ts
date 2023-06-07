import { Model } from 'mongoose';
import { ProposalDocument } from 'src/modules/proposal/schema/proposal.schema';
import { INACTIVE_LOCATIONS } from 'src/shared/constants/mii-locations';
import { IDbMigration } from '../types/db-migration.interface';

export class Migration003 implements IDbMigration {
  constructor(private proposalModel: Model<ProposalDocument>) {}

  async up(migrationVersion: number) {
    const query = this.proposalModel.find({ migrationError: { $exists: false } });
    for await (const proposal of query) {
      try {
        if (proposal.numberOfRequestedLocations > 0) {
          proposal.openDizChecks = proposal.openDizChecks.filter((location) => !INACTIVE_LOCATIONS.includes(location));
          proposal.dizApprovedLocations = proposal.dizApprovedLocations.filter(
            (location) => !INACTIVE_LOCATIONS.includes(location),
          );
          proposal.uacApprovedLocations = proposal.uacApprovedLocations.filter(
            (location) => !INACTIVE_LOCATIONS.includes(location),
          );
          proposal.requestedButExcludedLocations = proposal.requestedButExcludedLocations.filter(
            (location) => !INACTIVE_LOCATIONS.includes(location),
          );
          // SignContracts are kept if any
          proposal.numberOfRequestedLocations =
            proposal.signedContracts.length +
            proposal.openDizChecks.length +
            proposal.dizApprovedLocations.length +
            proposal.uacApprovedLocations.length +
            proposal.requestedButExcludedLocations.length;

          proposal.numberOfApprovedLocations = proposal.uacApprovedLocations.length;
        }

        proposal.migrationVersion = migrationVersion;
        proposal.migrationError = undefined;

        await proposal.save();
      } catch (error) {
        const proposalId = proposal._id.toString();
        const stringifiedError = JSON.stringify(error);
        console.log(`Migration003: Error migrating proposal with id ${proposalId}. Error: ${stringifiedError}`);

        try {
          const cleanDocument = await this.proposalModel.findById(proposalId);
          cleanDocument.migrationError = stringifiedError;
          await cleanDocument.save({ validateBeforeSave: false });
        } catch (error) {
          const stringifiedErrorCleanDocument = JSON.stringify(error);
          console.log(
            `Migration003: Error migrating proposal with id ${proposalId} while setting migrationError. Error: ${stringifiedErrorCleanDocument}`,
          );
        }
      }
    }
  }

  async down() {
    // Nothing to do here
  }
}
