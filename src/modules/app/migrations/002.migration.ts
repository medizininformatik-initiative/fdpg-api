import { Model, Types } from 'mongoose';
import { ProjectUserType } from 'src/modules/proposal/enums/project-user-type.enum';
import { ProposalStatus } from 'src/modules/proposal/enums/proposal-status.enum';
import { Proposal, ProposalDocument } from 'src/modules/proposal/schema/proposal.schema';
import { Institute } from 'src/modules/proposal/schema/sub-schema/participants/institute.schema';
import { ParticipantCategory } from 'src/modules/proposal/schema/sub-schema/participants/participant-category.schema';
import { Researcher } from 'src/modules/proposal/schema/sub-schema/participants/researcher.schema';
import { KeycloakService } from 'src/modules/user/keycloak.service';
import { IGetKeycloakUser } from 'src/modules/user/types/keycloak-user.interface';
import { CountryCode } from 'src/shared/enums/country-code.enum';
import { IDbMigration } from '../types/db-migration.interface';

const placeholderLong = 'Technische Umstellung: zum Zeitpunkt der Antragstellung nicht existierendes Feld';
const placeholderShort = 'N/A';
const placeholderEmail = 'info@forschen-fuer-gesundheit.de';
const placeHolderPostalCode = '10117';

export class Migration002 implements IDbMigration {
  constructor(private proposalModel: Model<ProposalDocument>, private keycloakService: KeycloakService) {}

  private async migrateApplicant(proposal: Proposal) {
    const owner = proposal.owner;
    let keycloakUser: IGetKeycloakUser | undefined;

    try {
      keycloakUser = await this.keycloakService.getUserById(owner.id);
    } catch (error) {
      console.log(`Migration002: User with id ${owner.id} not found in Keycloak`);
    }

    const miiLocation = owner.miiLocation ?? keycloakUser?.attributes?.MII_LOCATION?.[0] ?? undefined;

    const participantCategory: ParticipantCategory = {
      category: undefined,
      isDone: proposal.status === ProposalStatus.Draft ? false : true,
      _id: new Types.ObjectId().toString(),
    };

    try {
      const institute: Institute = {
        _id: new Types.ObjectId().toString(),
        isDone: proposal.status === ProposalStatus.Draft ? false : true,
        miiLocation: miiLocation,
        city: miiLocation ? undefined : keycloakUser?.attributes?.['organization.city']?.[0] ?? placeholderLong,
        country: miiLocation ? undefined : keycloakUser?.attributes?.['organization.country']?.[0] ?? CountryCode.De,
        email: miiLocation ? undefined : keycloakUser?.attributes?.['organization.email']?.[0] ?? placeholderEmail,
        houseNumber: miiLocation
          ? undefined
          : keycloakUser?.attributes?.['organization.houseNumber']?.[0] ?? placeholderShort,
        name: miiLocation ? undefined : keycloakUser?.attributes?.['organization.name']?.[0] ?? placeholderLong,
        postalCode: miiLocation
          ? undefined
          : keycloakUser?.attributes?.['organization.postalCode']?.[0] ?? placeHolderPostalCode,
        streetAddress: miiLocation
          ? undefined
          : keycloakUser?.attributes?.['organization.street']?.[0] ?? placeholderLong,
      };

      const researcher: Researcher = {
        _id: new Types.ObjectId().toString(),
        isDone: proposal.status === ProposalStatus.Draft ? false : true,
        affiliation: keycloakUser?.attributes?.['affiliation']?.[0] ?? placeholderLong,
        email: owner.email ?? keycloakUser?.email ?? placeholderEmail,
        firstName: owner.firstName ?? keycloakUser?.firstName ?? placeholderLong,
        lastName: owner.lastName ?? keycloakUser?.lastName ?? placeholderLong,
        title: keycloakUser?.attributes?.['title']?.[0] ?? '',
      };

      proposal.applicant = {
        participantCategory,
        institute,
        researcher,
      };
    } catch (error) {
      console.log(
        `Migration002: Error while migrating applicant for proposal ${proposal._id.toString()} error: ${JSON.stringify(
          error,
        )}`,
      );
      console.log(
        `Migration002: Error while migrating applicant for proposal ${proposal._id.toString()} keycloakUser: ${JSON.stringify(
          keycloakUser,
        )}`,
      );
      Promise.reject(error);
    }
  }

  private migrateProjectResponsible(proposal: Proposal) {
    proposal.projectResponsible = {
      projectResponsibility: {
        _id: new Types.ObjectId().toString(),
        applicantIsProjectResponsible: true,
      },
      institute: undefined,
      researcher: undefined,
      participantCategory: undefined,
    };
  }

  private migrateProjectUser(proposal: Proposal) {
    proposal.projectUser = {
      _id: new Types.ObjectId().toString(),
      isDone: proposal.status === ProposalStatus.Draft ? false : true,
      projectUserType: ProjectUserType.OrganizationOfProjectResponsible,
    };
  }

  async up(migrationVersion: number) {
    const query = this.proposalModel.find({ migrationError: { $exists: false } });
    for await (const proposal of query) {
      try {
        await this.migrateApplicant(proposal);
        this.migrateProjectResponsible(proposal);
        this.migrateProjectUser(proposal);
        proposal.migrationVersion = migrationVersion;
        proposal.migrationError = undefined;

        await proposal.save({ validateBeforeSave: false });
      } catch (error) {
        const proposalId = proposal._id.toString();
        const stringifiedError = JSON.stringify(error);
        console.log(`Migration002: Error migrating proposal with id ${proposalId}. Error: ${stringifiedError}`);

        try {
          const cleanDocument = await this.proposalModel.findById(proposalId);
          cleanDocument.migrationError = stringifiedError;
          await cleanDocument.save({ validateBeforeSave: false });
        } catch (error) {
          const stringifiedErrorCleanDocument = JSON.stringify(error);
          console.log(
            `Migration002: Error migrating proposal with id ${proposalId} while setting migrationError. Error: ${stringifiedErrorCleanDocument}`,
          );
        }
      }
    }
  }

  async down() {
    // Nothing to do here
  }
}
