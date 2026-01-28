import { Injectable } from '@nestjs/common';
import { EmailService } from 'src/modules/email/email.service';
import { EmailCategory } from 'src/modules/email/types/email-category.enum';
import { EmailRoleTargets } from 'src/modules/email/types/email-role-targets.enum';
import { TemplateProposalEmailConditionKeys } from 'src/modules/email/types/template-email-param-keys.types';
import { Proposal } from 'src/modules/proposal/schema/proposal.schema';
import { sendMailsUtil } from '../../send-mails.util';
import { KeycloakUtilService } from 'src/modules/user/keycloak-util.service';
import { Location } from 'src/modules/location/schema/location.schema';

@Injectable()
export class DataDeliveryEventService {
  constructor(
    private readonly emailService: EmailService,
    private readonly keycloakUtilService: KeycloakUtilService,
  ) {}

  private readonly category = EmailCategory.DataDelivery;

  async handleDataDeliveryInitiated(proposal: Proposal, proposalUrl: string, locations: Location[]) {
    await this.sendMails(
      proposal,
      proposalUrl,
      [EmailRoleTargets.RESEARCHER, EmailRoleTargets.DIZ],
      { conditionProposalDataDelivery: true },
      locations.map((loc) => loc._id),
    );
  }

  async handleDataDeliveryDataReady(proposal: Proposal, proposalUrl: string, locations: Location[]) {
    await this.sendMails(
      proposal,
      proposalUrl,
      [EmailRoleTargets.RESEARCHER, EmailRoleTargets.DIZ],
      { conditionProposalDataReady: true },
      locations.map((loc) => loc._id),
    );
  }

  async handleDataDeliveryDataReturn(proposal: Proposal, proposalUrl: string) {
    await this.sendMails(proposal, proposalUrl, [EmailRoleTargets.RESEARCHER, EmailRoleTargets.FDPG], {
      conditionProposalDataReturn: true,
    });
  }

  private async sendMails(
    proposal: Proposal,
    proposalUrl: string,
    targets: EmailRoleTargets[] = [],
    emailParameterMap: Partial<Record<TemplateProposalEmailConditionKeys, boolean>> = {},
    locations: string[] = [],
  ) {
    await sendMailsUtil(
      proposal,
      proposalUrl,
      targets,
      locations,
      emailParameterMap,
      this.emailService,
      this.keycloakUtilService,
      [this.category],
    );
  }
}
