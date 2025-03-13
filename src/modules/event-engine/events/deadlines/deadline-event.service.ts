import { Injectable } from '@nestjs/common';
import { EmailService } from 'src/modules/email/email.service';
import { DueDateEnum } from 'src/modules/proposal/enums/due-date.enum';
import { Proposal } from 'src/modules/proposal/schema/proposal.schema';
import { KeycloakUtilService } from 'src/modules/user/keycloak-util.service';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import {
  fdpgDeadlineEmailHeader,
  defaultDeadlineEmailBody,
  getDeadlineEmailContent,
  defaultDeadlineEmailFooter,
} from './deadline.emails';
import { IEmail } from 'src/modules/email/types/email.interface';
import { EmailCategory } from 'src/modules/email/types/email-category.enum';

@Injectable()
export class DeadlineEventService {
  constructor(
    private keycloakUtilService: KeycloakUtilService,
    private emailService: EmailService,
  ) {}

  async sendForDeadlineChange(proposal: Proposal, changeList: Record<DueDateEnum, Date | null>, proposalUrl: string) {
    const fdpgMailMessage = this.buildFdpgMailMessage(proposal, changeList, proposalUrl);
    const dizMailMessage = this.buildDizMailMessage(proposal, changeList, proposalUrl);
    const uacMailMessage = this.buildUacMailMessage(proposal, changeList, proposalUrl);
    const researcherMailMessage = this.buildResearcherMailMessage(proposal, changeList, proposalUrl);

    const emailTasks: Promise<void>[] = [];

    const fdpgDeadlineNotification = async (): Promise<void> | null => {
      if (!fdpgMailMessage) {
        return null;
      }
      const validFdpgContacts = await this.keycloakUtilService
        .getFdpgMembers()
        .then((members) => members.map((member) => member.email));
      const mail = this.buildMail(validFdpgContacts, fdpgMailMessage);

      return await this.emailService.send(mail);
    };

    const dizDeadlineNotification = async (): Promise<void> | null => {
      if (!dizMailMessage) {
        return null;
      }
      const locations = [
        ...proposal.openDizChecks,
        ...proposal.dizApprovedLocations,
        ...proposal.openDizConditionChecks,
        ...proposal.uacApprovedLocations,
      ];
      const validDizContacts = await this.keycloakUtilService
        .getDizMembers()
        .then((members) => this.keycloakUtilService.getLocationContacts(locations, members));
      const mail = this.buildMail(validDizContacts, dizMailMessage);

      return await this.emailService.send(mail);
    };

    const uacDeadlineNotification = async (): Promise<void> | null => {
      if (!uacMailMessage) {
        return null;
      }
      const locations = [
        ...proposal.openDizChecks,
        ...proposal.dizApprovedLocations,
        ...proposal.openDizConditionChecks,
        ...proposal.uacApprovedLocations,
      ];
      const validUacContacts = await this.keycloakUtilService
        .getUacMembers()
        .then((members) => this.keycloakUtilService.getLocationContacts(locations, members));
      const mail = this.buildMail(validUacContacts, dizMailMessage);
      return await this.emailService.send(mail);
    };

    const researcherDeadlineNotification = async (): Promise<void> | null => {
      if (!researcherMailMessage) {
        return null;
      }
      const validOwnerContacts = await this.keycloakUtilService.getValidContactsByUserIds([proposal.owner.id]);
      const mail = this.buildMail(validOwnerContacts, researcherMailMessage);

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

  private buildMail = (contacts: string[], message: string): IEmail => {
    return {
      to: contacts,
      categories: [EmailCategory.DeadlineChange],
      subject: 'Änderungen der Fristen',
      text: message,
    };
  };

  private buildFdpgMailMessage(
    proposal: Proposal,
    changeList: Record<DueDateEnum, Date | null>,
    proposalUrl: string,
  ): string | null {
    const relevantChanges = Object.keys(DueDateEnum).map((key) => key as DueDateEnum);
    return this.buildMailMessage(fdpgDeadlineEmailHeader, relevantChanges, changeList, proposal, proposalUrl);
  }

  private buildDizMailMessage(
    proposal: Proposal,
    changeList: Record<DueDateEnum, Date | null>,
    proposalUrl: string,
  ): string | null {
    const relevantChanges = [
      DueDateEnum.DUE_DAYS_LOCATION_CHECK,
      DueDateEnum.DUE_DAYS_LOCATION_CONTRACTING,
      DueDateEnum.DUE_DAYS_EXPECT_DATA_DELIVERY,
      DueDateEnum.DUE_DAYS_DATA_CORRUPT,
      DueDateEnum.DUE_DAYS_FINISHED_PROJECT,
    ];
    return this.buildMailMessage(fdpgDeadlineEmailHeader, relevantChanges, changeList, proposal, proposalUrl);
  }

  private buildUacMailMessage(
    proposal: Proposal,
    changeList: Record<DueDateEnum, Date | null>,
    proposalUrl: string,
  ): string | null {
    const relevantChanges = [
      DueDateEnum.DUE_DAYS_LOCATION_CHECK,
      DueDateEnum.DUE_DAYS_LOCATION_CONTRACTING,
      DueDateEnum.DUE_DAYS_EXPECT_DATA_DELIVERY,
      DueDateEnum.DUE_DAYS_DATA_CORRUPT,
      DueDateEnum.DUE_DAYS_FINISHED_PROJECT,
    ];
    return this.buildMailMessage(fdpgDeadlineEmailHeader, relevantChanges, changeList, proposal, proposalUrl);
  }

  private buildResearcherMailMessage(
    proposal: Proposal,
    changeList: Record<DueDateEnum, Date | null>,
    proposalUrl: string,
  ): string | null {
    const relevantChanges = Object.keys(DueDateEnum).map((key) => key as DueDateEnum);
    return this.buildMailMessage(fdpgDeadlineEmailHeader, relevantChanges, changeList, proposal, proposalUrl);
  }

  private buildMailMessage(
    header: string,
    relevantChanges: DueDateEnum[],
    changeList: Record<DueDateEnum, Date | null>,
    proposal: Proposal,
    proposalUrl: string,
  ): string | null {
    const relevantContent = Object.keys(changeList).filter((key) => relevantChanges.includes(key as DueDateEnum));

    if (relevantContent.length === 0) {
      return null;
    }

    const content = relevantContent
      .map((key) => getDeadlineEmailContent(key as DueDateEnum, changeList[key]))
      .reduce((acc, cur) => acc + cur, '');

    return [header, defaultDeadlineEmailBody(proposal), content, defaultDeadlineEmailFooter(proposalUrl)].reduce(
      (acc, cur) => acc + cur,
      '',
    );
  }
}
