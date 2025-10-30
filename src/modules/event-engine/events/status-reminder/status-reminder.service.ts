import { Injectable } from '@nestjs/common';
import { EmailService } from 'src/modules/email/email.service';
import { ScheduleType } from 'src/modules/scheduler/enums/schedule-type.enum';
import { Schedule } from 'src/modules/scheduler/schema/schedule.schema';
import { KeycloakUtilService } from 'src/modules/user/keycloak-util.service';
import { ProposalWithoutContent } from '../../types/proposal-without-content.type';

import { getProposalFdpgCheckReminderEmailForFdpg } from './proposal-fdpg-check.emails';
import { dizEmail, researcherEmail, uacEmail } from 'src/modules/email/proposal.emails';
import { EmailCategory } from 'src/modules/email/types/email-category.enum';

@Injectable()
export class StatusReminderService {
  constructor(
    private keycloakUtilService: KeycloakUtilService,
    private emailService: EmailService,
  ) {}

  private async handleFdpgCheckReminder(proposal: ProposalWithoutContent, proposalUrl: string) {
    const fdpgTask = async () => {
      const validFdpgContacts = await this.keycloakUtilService
        .getFdpgMemberLevelContacts(proposal)
        .then((members) => members.map((member) => member.email));
      const mail = getProposalFdpgCheckReminderEmailForFdpg(validFdpgContacts, proposal, proposalUrl);
      return await this.emailService.send(mail);
    };

    const emailTasks = [fdpgTask()];

    await Promise.allSettled(emailTasks);
  }

  private async handleLocationCheckReminder(proposal: ProposalWithoutContent, proposalUrl: string) {
    const dizTask = async () => {
      const locations = [...proposal.openDizChecks];
      const validDizContacts = await this.keycloakUtilService
        .getDizMembers()
        .then((members) => this.keycloakUtilService.getLocationContacts(locations, members));

      const mail = dizEmail(validDizContacts, proposal, [EmailCategory.StatusReminder], proposalUrl, {
        conditionProposalUacReminder: true,
      });

      return await this.emailService.send(mail);
    };

    const uacTask = async () => {
      const locations = [...proposal.dizApprovedLocations];
      const validUacContacts = await this.keycloakUtilService
        .getUacMembers()
        .then((members) => this.keycloakUtilService.getLocationContacts(locations, members));

      const mail = uacEmail(validUacContacts, proposal, [EmailCategory.StatusReminder], proposalUrl, {
        conditionProposalUacReminder: true,
      });

      return await this.emailService.send(mail);
    };

    const emailTasks = [dizTask(), uacTask()];

    await Promise.allSettled(emailTasks);
  }

  private async handleResearcherPublicationsReminder(proposal: ProposalWithoutContent, proposalUrl: string) {
    const ownerTask = async () => {
      const validOwnerContacts = await this.keycloakUtilService.getValidContactsByUserIds([proposal.owner.id]);
      const mail = researcherEmail(validOwnerContacts, proposal, [EmailCategory.StatusReminder], proposalUrl, {
        conditionProposalPublication: true,
      });
      return await this.emailService.send(mail);
    };

    const emailTasks = [ownerTask()];

    await Promise.allSettled(emailTasks);
  }

  async handleStatusReminder(proposal: ProposalWithoutContent, proposalUrl: string, event: Schedule) {
    switch (event.type) {
      case ScheduleType.ReminderFdpgCheck:
        await this.handleFdpgCheckReminder(proposal, proposalUrl);
        break;
      case ScheduleType.ReminderLocationCheck1:
      case ScheduleType.ReminderLocationCheck2:
      case ScheduleType.ReminderLocationCheck3:
        await this.handleLocationCheckReminder(proposal, proposalUrl);
        break;
      case ScheduleType.ReminderResearcherPublications:
        await this.handleResearcherPublicationsReminder(proposal, proposalUrl);
        break;
    }
  }
}
