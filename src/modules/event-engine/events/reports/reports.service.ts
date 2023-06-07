import { Injectable } from '@nestjs/common';
import { EmailService } from 'src/modules/email/email.service';
import { ReportDto } from 'src/modules/proposal/dto/proposal/report.dto';
import { KeycloakUtilService } from 'src/modules/user/keycloak-util.service';
import { Proposal } from '../../../proposal/schema/proposal.schema';
import {
  getReportCreateEmailForFdpgMember,
  getReportUpdateEmailForFdpgMember,
  getReportDeleteEmailForFdpgMember,
} from './reports.emails';

@Injectable()
export class ReportsService {
  constructor(private keycloakUtilService: KeycloakUtilService, private emailService: EmailService) {}

  async handleReportCreate(proposal: Proposal, report: ReportDto, proposalUrl: string) {
    const emailTasks: Promise<void>[] = [];

    const fdpgTask = async () => {
      const validFdpgContacts = await this.keycloakUtilService
        .getFdpgMembers()
        .then((members) => members.map((member) => member.email));
      const mail = getReportCreateEmailForFdpgMember(validFdpgContacts, proposal, report, proposalUrl);
      return await this.emailService.send(mail);
    };

    emailTasks.push(fdpgTask());

    await Promise.allSettled(emailTasks);
  }

  async handleReportUpdate(proposal: Proposal, report: ReportDto, proposalUrl: string) {
    const emailTasks: Promise<void>[] = [];

    const fdpgTask = async () => {
      const validFdpgContacts = await this.keycloakUtilService
        .getFdpgMembers()
        .then((members) => members.map((member) => member.email));
      const mail = getReportUpdateEmailForFdpgMember(validFdpgContacts, proposal, report, proposalUrl);
      return await this.emailService.send(mail);
    };

    emailTasks.push(fdpgTask());

    await Promise.allSettled(emailTasks);
  }

  async handleReportDelete(proposal: Proposal, report: ReportDto, proposalUrl: string) {
    const emailTasks: Promise<void>[] = [];

    const fdpgTask = async () => {
      const validFdpgContacts = await this.keycloakUtilService
        .getFdpgMembers()
        .then((members) => members.map((member) => member.email));
      const mail = getReportDeleteEmailForFdpgMember(validFdpgContacts, proposal, report, proposalUrl);
      return await this.emailService.send(mail);
    };

    emailTasks.push(fdpgTask());

    await Promise.allSettled(emailTasks);
  }
}
