import { Injectable, Logger } from '@nestjs/common';
import { Proposal } from '../schema/proposal.schema';
import { PublicationCreateDto, PublicationUpdateDto } from '../dto/proposal/publication.dto';
import { ModificationContext } from '../enums/modification-context.enum';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import { RegistrationFormCrudService } from './registration-form-crud.service';

@Injectable()
export class RegistrationFormPublicationService {
  private readonly logger = new Logger(RegistrationFormPublicationService.name);

  constructor(private readonly registrationFormCrudService: RegistrationFormCrudService) {}

  async handlePublicationCreate(
    proposal: Proposal,
    publication: PublicationCreateDto,
    user: IRequestUser,
  ): Promise<void> {
    if (!this.registrationFormCrudService.checkProposalType(proposal)) {
      return;
    }

    this.logger.log(`Syncing publication create from proposal ${proposal.projectAbbreviation} to registration`);

    const registration = await this.registrationFormCrudService.getRegistration(
      proposal,
      user,
      ModificationContext.Publication,
    );

    // Find the newly created publication from the proposal to get its _id
    const newPublication = proposal.publications.find(
      (pub) => pub.title === publication.title && pub.doi === publication.doi && pub.link === publication.link,
    );

    if (newPublication) {
      registration.publications = [
        ...registration.publications,
        {
          _id: newPublication._id,
          title: newPublication.title,
          doi: newPublication.doi,
          link: newPublication.link,
          createdAt: newPublication.createdAt,
          updatedAt: newPublication.updatedAt,
        },
      ];

      await registration.save();
      this.logger.log(
        `Successfully synced publication '${newPublication.title}' (${newPublication._id}) to registration ${registration.projectAbbreviation}`,
      );
      await this.registrationFormCrudService.setRegistrationOutOfSync(registration._id);
    } else {
      this.logger.warn(
        `Could not find newly created publication in proposal ${proposal.projectAbbreviation} to sync to registration`,
      );
    }
  }

  async handlePublicationUpdate(
    proposal: Proposal,
    publicationId: string,
    publication: PublicationUpdateDto,
    user: IRequestUser,
  ): Promise<void> {
    if (!this.registrationFormCrudService.checkProposalType(proposal)) {
      return;
    }

    this.logger.log(
      `Syncing publication update (${publicationId}) from proposal ${proposal.projectAbbreviation} to registration`,
    );

    const registration = await this.registrationFormCrudService.getRegistration(
      proposal,
      user,
      ModificationContext.Publication,
    );

    const publicationIdx = registration.publications.findIndex((pub) => pub._id.toString() === publicationId);

    if (publicationIdx !== -1) {
      const createdAt = registration.publications[publicationIdx].createdAt;
      registration.publications[publicationIdx] = {
        ...publication,
        _id: publicationId,
        updatedAt: new Date(),
        createdAt,
      };

      await registration.save();
      this.logger.log(
        `Successfully synced publication update '${publication.title}' (${publicationId}) to registration ${registration.projectAbbreviation}`,
      );
      await this.registrationFormCrudService.setRegistrationOutOfSync(registration._id);
    } else {
      this.logger.warn(
        `Publication ${publicationId} not found in registration ${registration.projectAbbreviation} for update sync`,
      );
    }
  }

  async handlePublicationDelete(proposal: Proposal, publicationId: string, user: IRequestUser): Promise<void> {
    if (!this.registrationFormCrudService.checkProposalType(proposal)) {
      return;
    }

    this.logger.log(
      `Syncing publication delete (${publicationId}) from proposal ${proposal.projectAbbreviation} to registration`,
    );

    const registration = await this.registrationFormCrudService.getRegistration(
      proposal,
      user,
      ModificationContext.Publication,
    );

    const publicationIdx = registration.publications.findIndex((pub) => pub._id.toString() === publicationId);

    if (publicationIdx !== -1) {
      registration.publications.splice(publicationIdx, 1);
      await registration.save();
      this.logger.log(
        `Successfully deleted publication (${publicationId}) from registration ${registration.projectAbbreviation}`,
      );
      await this.registrationFormCrudService.setRegistrationOutOfSync(registration._id);
    } else {
      this.logger.warn(
        `Publication ${publicationId} not found in registration ${registration.projectAbbreviation} for delete sync`,
      );
    }
  }
}
