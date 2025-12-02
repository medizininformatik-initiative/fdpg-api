import { Injectable } from '@nestjs/common';
import { EmailService } from 'src/modules/email/email.service';
import { ScheduleType } from 'src/modules/scheduler/enums/schedule-type.enum';
import { Schedule } from 'src/modules/scheduler/schema/schedule.schema';
import { KeycloakUtilService } from 'src/modules/user/keycloak-util.service';
import { ProposalWithoutContent } from '../../types/proposal-without-content.type';
import { dizEmail, fdpgEmail, researcherEmail, uacEmail } from 'src/modules/email/proposal.emails';
import { EmailCategory } from 'src/modules/email/types/email-category.enum';
import {
  getEmailReminderText as getEmailReminderDueDaysText,
  getEmailReminderFinishedProjectDueDaysText,
} from 'src/modules/email/util/email.util';

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
      const mail = fdpgEmail(validFdpgContacts, proposal, [EmailCategory.StatusReminder], proposalUrl, {
        conditionFdpgCheckReminderForFdpg: true,
      });
      return await this.emailService.send(mail);
    };

    const emailTasks = [fdpgTask()];

    await Promise.allSettled(emailTasks);
  }

  private async handleLocationCheckReminder(proposal: ProposalWithoutContent, proposalUrl: string, type: 0 | 1 | 2) {
    const dizTask = async () => {
      const locations = [...proposal.openDizChecks];
      const validDizContacts = await this.keycloakUtilService
        .getDizMembers()
        .then((members) => this.keycloakUtilService.getLocationContacts(locations, members));

      const mail = dizEmail(validDizContacts, proposal, [EmailCategory.StatusReminder], proposalUrl, {
        conditionProposalUacReminder: true,
        DUE_DAYS_LOCATION_CHECK: getEmailReminderDueDaysText(type),
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
        DUE_DAYS_LOCATION_CHECK: getEmailReminderDueDaysText(type),
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

  private async handleFinishedProjectReminder(proposal: ProposalWithoutContent, proposalUrl: string, type: 0 | 1) {
    const fdpgTask = async () => {
      const validFdpgContacts = await this.keycloakUtilService
        .getFdpgMemberLevelContacts(proposal)
        .then((members) => members.map((member) => member.email));
      const mail = fdpgEmail(validFdpgContacts, proposal, [EmailCategory.StatusReminder], proposalUrl, {
        conditionProposalFinishedReminderForFdpg: true,
        DUE_DAYS_FINISHED_PROJECT: getEmailReminderFinishedProjectDueDaysText(type),
      });
      return await this.emailService.send(mail);
    };

    const emailTasks = [fdpgTask()];

    await Promise.allSettled(emailTasks);
  }

  async handleStatusReminder(proposal: ProposalWithoutContent, proposalUrl: string, event: Schedule) {
    switch (event.type) {
      case ScheduleType.ReminderFdpgCheck:
        await this.handleFdpgCheckReminder(proposal, proposalUrl);
        break;
      case ScheduleType.ReminderLocationCheck1:
        await this.handleLocationCheckReminder(proposal, proposalUrl, 0);
        break;
      case ScheduleType.ReminderLocationCheck2:
        await this.handleLocationCheckReminder(proposal, proposalUrl, 1);
        break;
      case ScheduleType.ReminderLocationCheck3:
        await this.handleLocationCheckReminder(proposal, proposalUrl, 2);
        break;
      case ScheduleType.ReminderResearcherPublications:
        await this.handleResearcherPublicationsReminder(proposal, proposalUrl);
        break;
      case ScheduleType.ReminderFinishedProject1:
        await this.handleFinishedProjectReminder(proposal, proposalUrl, 0);
        break;
      case ScheduleType.ReminderFinishedProject2:
        await this.handleFinishedProjectReminder(proposal, proposalUrl, 1);
        break;
    }
  }
}
