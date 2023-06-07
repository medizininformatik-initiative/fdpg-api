import { Injectable } from '@nestjs/common';
import { EmailService } from 'src/modules/email/email.service';
import { ScheduleType } from 'src/modules/scheduler/enums/schedule-type.enum';
import { Schedule } from 'src/modules/scheduler/schema/schedule.schema';
import { KeycloakUtilService } from 'src/modules/user/keycloak-util.service';
import { ProposalWithoutContent } from '../../types/proposal-without-content.type';
import { getPublicationsReminderEmailForOwner } from './proposal-data-research.emails';

import { getProposalFdpgCheckReminderEmailForFdpg } from './proposal-fdpg-check.emails';
import {
  getProposalLocationCheckReminderEmail1ForDiz,
  getProposalLocationCheckReminderEmail1ForUac,
  getProposalLocationCheckReminderEmail2ForDiz,
  getProposalLocationCheckReminderEmail2ForUac,
  getProposalLocationCheckReminderEmail3ForDiz,
  getProposalLocationCheckReminderEmail3ForUac,
} from './proposal-location-check.emails';

@Injectable()
export class StatusReminderService {
  constructor(private keycloakUtilService: KeycloakUtilService, private emailService: EmailService) {}

  private async handleFdpgCheckReminder(proposal: ProposalWithoutContent, proposalUrl: string) {
    const fdpgTask = async () => {
      const validFdpgContacts = await this.keycloakUtilService
        .getFdpgMembers()
        .then((members) => members.map((member) => member.email));
      const mail = getProposalFdpgCheckReminderEmailForFdpg(validFdpgContacts, proposal, proposalUrl);
      return await this.emailService.send(mail);
    };

    const emailTasks = [fdpgTask()];

    await Promise.allSettled(emailTasks);
  }

  private async handleLocationCheckReminder(proposal: ProposalWithoutContent, proposalUrl: string, type: 1 | 2 | 3) {
    const dizEmails = [
      getProposalLocationCheckReminderEmail1ForDiz,
      getProposalLocationCheckReminderEmail2ForDiz,
      getProposalLocationCheckReminderEmail3ForDiz,
    ];

    const uacEmails = [
      getProposalLocationCheckReminderEmail1ForUac,
      getProposalLocationCheckReminderEmail2ForUac,
      getProposalLocationCheckReminderEmail3ForUac,
    ];

    const dizTask = async () => {
      const locations = [...proposal.openDizChecks];
      const validDizContacts = await this.keycloakUtilService
        .getDizMembers()
        .then((members) => this.keycloakUtilService.getLocationContacts(locations, members));
      const mail = dizEmails[type - 1](validDizContacts, proposal, proposalUrl);
      return await this.emailService.send(mail);
    };

    const uacTask = async () => {
      const locations = [...proposal.dizApprovedLocations];
      const validUacContacts = await this.keycloakUtilService
        .getUacMembers()
        .then((members) => this.keycloakUtilService.getLocationContacts(locations, members));
      const mail = uacEmails[type - 1](validUacContacts, proposal, proposalUrl);
      return await this.emailService.send(mail);
    };

    const emailTasks = [dizTask(), uacTask()];

    await Promise.allSettled(emailTasks);
  }

  private async handleResearcherPublicationsReminder(proposal: ProposalWithoutContent, proposalUrl: string) {
    const ownerTask = async () => {
      const validOwnerContacts = await this.keycloakUtilService.getValidContactsByUserIds([proposal.owner.id]);
      const mail = getPublicationsReminderEmailForOwner(validOwnerContacts, proposal, proposalUrl);
      return await this.emailService.send(mail);
    };

    const emailTasks = [ownerTask()];

    await Promise.allSettled(emailTasks);
  }

  async handleStatusReminder(proposal: ProposalWithoutContent, proposalUrl: string, event: Schedule) {
    switch (event.type) {
      case ScheduleType.ReminderFdpgCheck:
        this.handleFdpgCheckReminder(proposal, proposalUrl);
        break;
      case ScheduleType.ReminderLocationCheck1:
        this.handleLocationCheckReminder(proposal, proposalUrl, 1);
        break;
      case ScheduleType.ReminderLocationCheck2:
        this.handleLocationCheckReminder(proposal, proposalUrl, 2);
        break;
      case ScheduleType.ReminderLocationCheck3:
        this.handleLocationCheckReminder(proposal, proposalUrl, 3);
        break;
      case ScheduleType.ReminderResearcherPublications:
        this.handleResearcherPublicationsReminder(proposal, proposalUrl);
        break;
    }
  }
}
