import { Model } from 'mongoose';
import { PublicationType } from 'src/modules/proposal/enums/publication-type.enum';
import { ProposalDocument } from 'src/modules/proposal/schema/proposal.schema';
import { IDbMigration } from '../types/db-migration.interface';

export class Migration004 implements IDbMigration {
  constructor(private proposalModel: Model<ProposalDocument>) {}

  async up(migrationVersion: number) {
    const query = this.proposalModel.find({ migrationError: { $exists: false } });
    for await (const proposal of query) {
      try {
        const hasPublications = proposal.userProject.plannedPublication?.publications?.length > 0;

        if (hasPublications) {
          proposal.userProject.plannedPublication.noPublicationPlanned = false;

          proposal.userProject.plannedPublication.publications =
            proposal.userProject.plannedPublication.publications.map((publication) => {
              return {
                _id: publication._id.toString(),
                type: PublicationType.JournalArticle,
                authors: publication.authors,
                description: publication.description,
              };
            });
        } else {
          proposal.userProject.plannedPublication.noPublicationPlanned = true;
        }

        proposal.migrationVersion = migrationVersion;
        proposal.migrationError = undefined;

        await proposal.save({ validateBeforeSave: false });
      } catch (error) {
        const proposalId = proposal._id.toString();
        const stringifiedError = JSON.stringify(error);
        console.log(`Migration004: Error migrating proposal with id ${proposalId}. Error: ${stringifiedError}`);

        try {
          const cleanDocument = await this.proposalModel.findById(proposalId);
          cleanDocument.migrationError = stringifiedError;
          await cleanDocument.save({ validateBeforeSave: false });
        } catch (error) {
          const stringifiedErrorCleanDocument = JSON.stringify(error);
          console.log(
            `Migration004: Error migrating proposal with id ${proposalId} while setting migrationError. Error: ${stringifiedErrorCleanDocument}`,
          );
        }
      }
    }
  }

  async down() {
    // Nothing to do here
  }
}
