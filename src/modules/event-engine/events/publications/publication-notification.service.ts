import { Injectable } from '@nestjs/common';
import { EmailService } from 'src/modules/email/email.service';
import { KeycloakUtilService } from 'src/modules/user/keycloak-util.service';
import { Proposal } from '../../../proposal/schema/proposal.schema';
import { PublicationCreateDto, PublicationUpdateDto } from 'src/modules/proposal/dto/proposal/publication.dto';
import { fdpgEmail } from 'src/modules/email/proposal.emails';
import { EmailCategory } from 'src/modules/email/types/email-category.enum';

@Injectable()
export class PublicationNotificationService {
  constructor(
    private keycloakUtilService: KeycloakUtilService,
    private emailService: EmailService,
  ) {}

  async handlePublicationCreate(proposal: Proposal, publication: PublicationCreateDto, proposalUrl: string) {
    const emailTasks: Promise<void>[] = [];

    const fdpgTask = async () => {
      const validFdpgContacts = await this.keycloakUtilService
        .getFdpgMemberLevelContacts(proposal)
        .then((members) => members.map((member) => member.email));

      const mail = fdpgEmail(validFdpgContacts, proposal, [EmailCategory.PublicationCreate], proposalUrl, {
        conditionProposalPublicationCreate: true,
      });

      return await this.emailService.send(mail);
    };

    emailTasks.push(fdpgTask());

    await Promise.allSettled(emailTasks);
  }

  async handlePublicationUpdate(proposal: Proposal, publication: PublicationUpdateDto, proposalUrl: string) {
    const emailTasks: Promise<void>[] = [];

    const fdpgTask = async () => {
      const validFdpgContacts = await this.keycloakUtilService
        .getFdpgMemberLevelContacts(proposal)
        .then((members) => members.map((member) => member.email));

      const mail = fdpgEmail(validFdpgContacts, proposal, [EmailCategory.PublicationUpdate], proposalUrl, {
        conditionProposalPublicationUpdate: true,
      });

      return await this.emailService.send(mail);
    };

    emailTasks.push(fdpgTask());

    await Promise.allSettled(emailTasks);
  }
}
