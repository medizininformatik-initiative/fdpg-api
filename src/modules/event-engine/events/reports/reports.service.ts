import { Injectable } from '@nestjs/common';
import { EmailService } from 'src/modules/email/email.service';
import { ReportDto } from 'src/modules/proposal/dto/proposal/report.dto';
import { KeycloakUtilService } from 'src/modules/user/keycloak-util.service';
import { Proposal } from '../../../proposal/schema/proposal.schema';
import { fdpgEmail } from 'src/modules/email/proposal.emails';
import { EmailCategory } from 'src/modules/email/types/email-category.enum';

@Injectable()
export class ReportsService {
  constructor(
    private keycloakUtilService: KeycloakUtilService,
    private emailService: EmailService,
  ) {}

  async handleReportCreate(proposal: Proposal, report: ReportDto, proposalUrl: string) {
    const emailTasks: Promise<void>[] = [];

    const fdpgTask = async () => {
      const validFdpgContacts = await this.keycloakUtilService
        .getFdpgMemberLevelContacts(proposal)
        .then((members) => members.map((member) => member.email));
      const mail = fdpgEmail(validFdpgContacts, proposal, [EmailCategory.ReportCreate], proposalUrl, {
        conditionProposalReportCreate: true,
      });
      return await this.emailService.send(mail);
    };

    emailTasks.push(fdpgTask());

    await Promise.allSettled(emailTasks);
  }
}
