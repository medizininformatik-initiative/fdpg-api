import { Injectable } from '@nestjs/common';
import { EmailService } from 'src/modules/email/email.service';
import { DueDateEnum } from 'src/modules/proposal/enums/due-date.enum';
import { Proposal } from 'src/modules/proposal/schema/proposal.schema';
import { KeycloakUtilService } from 'src/modules/user/keycloak-util.service';
import { getDeadlineEmailContent, deadlineEmail } from './deadline.emails';
import { ITemplateEmail } from 'src/modules/email/types/email.interface';
import { EmailCategory } from 'src/modules/email/types/email-category.enum';

@Injectable()
export class DeadlineEventService {
  constructor(
    private keycloakUtilService: KeycloakUtilService,
    private emailService: EmailService,
  ) {}

  async sendForDeadlineChange(proposal: Proposal, changeList: Record<DueDateEnum, Date | null>, proposalUrl: string) {
    const emailTasks: Promise<void>[] = [];

    const fdpgDeadlineNotification = async (): Promise<void> | null => {
      const validFdpgContacts = await this.keycloakUtilService
        .getFdpgMemberLevelContacts(proposal)
        .then((members) => members.map((member) => member.email));

      const mail = this.buildFdpgMailMessage(validFdpgContacts, proposal, changeList, proposalUrl);

      if (!mail) {
        return Promise.resolve();
      }

      return await this.emailService.send(mail);
    };

    const dizDeadlineNotification = async (): Promise<void> | null => {
      const locations = [
        ...proposal.openDizChecks,
        ...proposal.dizApprovedLocations,
        ...proposal.openDizConditionChecks,
        ...proposal.uacApprovedLocations,
      ];
      const validDizContacts = await this.keycloakUtilService
        .getDizMembers()
        .then((members) => this.keycloakUtilService.getLocationContacts(locations, members));

      const mail = this.buildDizMailMessage(validDizContacts, proposal, changeList, proposalUrl);

      if (!mail) {
        return Promise.resolve();
      }

      return await this.emailService.send(mail);
    };

    const uacDeadlineNotification = async (): Promise<void> | null => {
      const locations = [
        ...proposal.openDizChecks,
        ...proposal.dizApprovedLocations,
        ...proposal.openDizConditionChecks,
        ...proposal.uacApprovedLocations,
      ];
      const validUacContacts = await this.keycloakUtilService
        .getUacMembers()
        .then((members) => this.keycloakUtilService.getLocationContacts(locations, members));

      const mail = this.buildUacMailMessage(validUacContacts, proposal, changeList, proposalUrl);

      if (!mail) {
        return Promise.resolve();
      }

      return await this.emailService.send(mail);
    };

    const researcherDeadlineNotification = async (): Promise<void> | null => {
      const validOwnerContacts = await this.keycloakUtilService.getValidContactsByUserIds([proposal.owner.id]);

      const mail = this.buildResearcherMailMessage(validOwnerContacts, proposal, changeList, proposalUrl);

      if (!mail) {
        return Promise.resolve();
      }

      return await this.emailService.send(mail);
    };

    emailTasks.push(
      ...[
        fdpgDeadlineNotification(),
        dizDeadlineNotification(),
        uacDeadlineNotification(),
        researcherDeadlineNotification(),
      ].filter((task) => task),
    );

    await Promise.allSettled(emailTasks);
  }

  private buildFdpgMailMessage(
    validContacts: string[],
    proposal: Proposal,
    changeList: Record<DueDateEnum, Date | null>,
    proposalUrl: string,
  ): ITemplateEmail | null {
    const relevantChanges = Object.keys(DueDateEnum).map((key) => key as DueDateEnum);
    return this.buildMailMessage(validContacts, relevantChanges, changeList, proposal, proposalUrl);
  }

  private buildDizMailMessage(
    validContacts: string[],
    proposal: Proposal,
    changeList: Record<DueDateEnum, Date | null>,
    proposalUrl: string,
  ): ITemplateEmail | null {
    const relevantChanges = [
      DueDateEnum.DUE_DAYS_LOCATION_CHECK,
      DueDateEnum.DUE_DAYS_LOCATION_CONTRACTING,
      DueDateEnum.DUE_DAYS_EXPECT_DATA_DELIVERY,
      DueDateEnum.DUE_DAYS_DATA_CORRUPT,
      DueDateEnum.DUE_DAYS_FINISHED_PROJECT,
    ];

    return this.buildMailMessage(validContacts, relevantChanges, changeList, proposal, proposalUrl);
  }

  private buildUacMailMessage(
    validContacts: string[],
    proposal: Proposal,
    changeList: Record<DueDateEnum, Date | null>,
    proposalUrl: string,
  ): ITemplateEmail | null {
    const relevantChanges = [
      DueDateEnum.DUE_DAYS_LOCATION_CHECK,
      DueDateEnum.DUE_DAYS_LOCATION_CONTRACTING,
      DueDateEnum.DUE_DAYS_EXPECT_DATA_DELIVERY,
      DueDateEnum.DUE_DAYS_DATA_CORRUPT,
      DueDateEnum.DUE_DAYS_FINISHED_PROJECT,
    ];
    return this.buildMailMessage(validContacts, relevantChanges, changeList, proposal, proposalUrl);
  }

  private buildResearcherMailMessage(
    validContacts: string[],
    proposal: Proposal,
    changeList: Record<DueDateEnum, Date | null>,
    proposalUrl: string,
  ): ITemplateEmail | null {
    const relevantChanges = Object.keys(DueDateEnum).map((key) => key as DueDateEnum);
    return this.buildMailMessage(validContacts, relevantChanges, changeList, proposal, proposalUrl);
  }

  private buildMailMessage(
    validContacts: string[],
    relevantChanges: DueDateEnum[],
    changeList: Record<DueDateEnum, Date | null>,
    proposal: Proposal,
    proposalUrl: string,
  ): ITemplateEmail | null {
    const relevantContent = Object.keys(changeList).filter((key) => relevantChanges.includes(key as DueDateEnum));

    if (relevantContent.length === 0) {
      return null;
    }

    const emailParams = relevantContent
      .map((key) => getDeadlineEmailContent(key as DueDateEnum, changeList[key]))
      .reduce((acc, cur) => Object.assign(acc, cur), {});

    return deadlineEmail(validContacts, proposal, [EmailCategory.DeadlineChange], proposalUrl, emailParams);
  }
}
