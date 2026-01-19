import { Injectable } from '@nestjs/common';
import { EmailService } from 'src/modules/email/email.service';
import { KeycloakUtilService } from 'src/modules/user/keycloak-util.service';
import { ProposalStatus } from '../../../proposal/enums/proposal-status.enum';
import { ProposalType } from '../../../proposal/enums/proposal-type.enum';
import { Proposal } from '../../../proposal/schema/proposal.schema';
import { EmailCategory } from 'src/modules/email/types/email-category.enum';
import { EmailRoleTargets } from 'src/modules/email/types/email-role-targets.enum';
import { TemplateProposalEmailConditionKeys } from 'src/modules/email/types/template-email-param-keys.types';
import { sendMailsUtil } from '../../send-mails.util';

@Injectable()
export class StatusChangeService {
  constructor(
    private keycloakUtilService: KeycloakUtilService,
    private emailService: EmailService,
  ) {}

  private readonly category: EmailCategory.StatusChange;

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

  async handleStatusChange(proposal: Proposal, proposalUrl: string) {
    switch (proposal.status) {
      case ProposalStatus.FdpgCheck:
        const isRegistrationForm = proposal.type === ProposalType.RegisteringForm;
        return await this.sendMails(proposal, proposalUrl, [EmailRoleTargets.RESEARCHER, EmailRoleTargets.FDPG], {
          conditionProposalFdpgCheck: !isRegistrationForm,
          conditionProposalRegistrationCreate: isRegistrationForm,
        });
      case ProposalStatus.Rework:
        return await this.sendMails(proposal, proposalUrl, [EmailRoleTargets.RESEARCHER], {
          conditionProposalRework: true,
        });
      case ProposalStatus.Rejected:
        return await this.sendMails(proposal, proposalUrl, [EmailRoleTargets.RESEARCHER, EmailRoleTargets.FDPG], {
          conditionProposalRejected: true,
        });
      case ProposalStatus.LocationCheck:
        return await this.sendMails(proposal, proposalUrl, [EmailRoleTargets.RESEARCHER, EmailRoleTargets.FDPG], {
          conditionProposalLocationCheck: true,
          conditionProposalUacCheck: true,
        });
      case ProposalStatus.Contracting:
        return await this.sendMails(proposal, proposalUrl, [EmailRoleTargets.RESEARCHER], {
          conditionProposalContracting: true,
        });
      case ProposalStatus.ExpectDataDelivery:
        return Promise.resolve(); // No E-Mail sent here
      case ProposalStatus.DataResearch:
        return await this.sendMails(
          proposal,
          proposalUrl,
          [EmailRoleTargets.RESEARCHER, EmailRoleTargets.DIZ],
          {
            conditionProposalDataResearch: true,
          },
          proposal.signedContracts.map((sc) => sc),
        );
      case ProposalStatus.FinishedProject:
        return await this.sendMails(proposal, proposalUrl, [EmailRoleTargets.RESEARCHER, EmailRoleTargets.FDPG], {
          conditionProposalFinished: true,
        });
      case ProposalStatus.Archived:
        return await this.sendMails(proposal, proposalUrl, [EmailRoleTargets.RESEARCHER, EmailRoleTargets.FDPG], {
          conditionProposalArchived: true,
        });
      case ProposalStatus.ReadyToPublish:
        return await this.handleProposalReadyToPublish(proposal, proposalUrl);
      case ProposalStatus.Published:
        return await this.handleProposalPublished(proposal, proposalUrl);

      default:
        break;
    }
  }

  private async handleProposalReadyToPublish(proposal: Proposal, proposalUrl: string) {
    // Handle ready to publish status - could send notifications
    // For now, this is a placeholder for future implementation
    console.log(`Proposal ${proposal.projectAbbreviation} is ready to publish`);
  }

  private async handleProposalPublished(proposal: Proposal, proposalUrl: string) {
    // Handle published status - could send notifications
    // For now, this is a placeholder for future implementation
    console.log(`Proposal ${proposal.projectAbbreviation} has been published`);
  }
}
