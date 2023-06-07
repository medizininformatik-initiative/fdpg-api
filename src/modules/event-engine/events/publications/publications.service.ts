import { Injectable } from '@nestjs/common';
import { EmailService } from 'src/modules/email/email.service';
import { KeycloakUtilService } from 'src/modules/user/keycloak-util.service';
import { Proposal } from '../../../proposal/schema/proposal.schema';
import {
  getPublicationCreateEmailForFdpgMember,
  getPublicationUpdateEmailForFdpgMember,
  getPublicationDeleteEmailForFdpgMember,
} from './publications.emails';
import { PublicationCreateDto, PublicationUpdateDto } from 'src/modules/proposal/dto/proposal/publication.dto';
import { Publication } from 'src/modules/proposal/schema/sub-schema/publication.schema';

@Injectable()
export class PublicationsService {
  constructor(private keycloakUtilService: KeycloakUtilService, private emailService: EmailService) {}

  async handlePublicationCreate(proposal: Proposal, publication: PublicationCreateDto, proposalUrl: string) {
    const emailTasks: Promise<void>[] = [];

    const fdpgTask = async () => {
      const validFdpgContacts = await this.keycloakUtilService
        .getFdpgMembers()
        .then((members) => members.map((member) => member.email));
      const mail = getPublicationCreateEmailForFdpgMember(validFdpgContacts, proposal, publication, proposalUrl);
      return await this.emailService.send(mail);
    };

    emailTasks.push(fdpgTask());

    await Promise.allSettled(emailTasks);
  }

  async handlePublicationUpdate(proposal: Proposal, publication: PublicationUpdateDto, proposalUrl: string) {
    const emailTasks: Promise<void>[] = [];

    const fdpgTask = async () => {
      const validFdpgContacts = await this.keycloakUtilService
        .getFdpgMembers()
        .then((members) => members.map((member) => member.email));
      const mail = getPublicationUpdateEmailForFdpgMember(validFdpgContacts, proposal, publication, proposalUrl);
      return await this.emailService.send(mail);
    };

    emailTasks.push(fdpgTask());

    await Promise.allSettled(emailTasks);
  }

  async handlePublicationDelete(proposal: Proposal, publication: Publication, proposalUrl: string) {
    const emailTasks: Promise<void>[] = [];

    const fdpgTask = async () => {
      const validFdpgContacts = await this.keycloakUtilService
        .getFdpgMembers()
        .then((members) => members.map((member) => member.email));
      const mail = getPublicationDeleteEmailForFdpgMember(validFdpgContacts, proposal, publication, proposalUrl);
      return await this.emailService.send(mail);
    };

    emailTasks.push(fdpgTask());

    await Promise.allSettled(emailTasks);
  }
}
