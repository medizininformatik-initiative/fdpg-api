import { Injectable } from '@nestjs/common';
import { EmailService } from 'src/modules/email/email.service';
import { KeycloakUtilService } from 'src/modules/user/keycloak-util.service';
import { ProposalStatus } from '../../../proposal/enums/proposal-status.enum';
import { ProposalType } from '../../../proposal/enums/proposal-type.enum';
import { Proposal } from '../../../proposal/schema/proposal.schema';
import { fdpgEmail, researcherEmail } from 'src/modules/email/proposal.emails';
import { EmailCategory } from 'src/modules/email/types/email-category.enum';
import { EmailRoleTargets } from 'src/modules/email/types/email-role-targets.enum';
import { TemplateProposalEmailConditionKeys } from 'src/modules/email/types/template-email-param-keys.types';

@Injectable()
export class StatusChangeService {
  constructor(
    private keycloakUtilService: KeycloakUtilService,
    private emailService: EmailService,
  ) {}

  private async sendMails(
    proposal: Proposal,
    proposalUrl: string,
    targets: EmailRoleTargets[] = [],
    emailParameterMap: Partial<Record<TemplateProposalEmailConditionKeys, boolean>> = {},
  ) {
    const ownerTask = async () => {
      if (!targets.includes(EmailRoleTargets.Researcher)) {
        return Promise.resolve();
      }
      const validOwnerContacts = await this.keycloakUtilService.getValidContactsByUserIds([proposal.owner.id]);
      const mail = researcherEmail(
        validOwnerContacts,
        proposal,
        [EmailCategory.StatusChange],
        proposalUrl,
        emailParameterMap,
      );

      return await this.emailService.send(mail);
    };

    const fdpgTask = async () => {
      if (!targets.includes(EmailRoleTargets.Fdpg)) {
        return Promise.resolve();
      }
      const validFdpgContacts = await this.keycloakUtilService
        .getFdpgMemberLevelContacts(proposal)
        .then((members) => members.map((member) => member.email));
      const mail = fdpgEmail(validFdpgContacts, proposal, [EmailCategory.StatusChange], proposalUrl, emailParameterMap);
      return await this.emailService.send(mail);
    };

    const emailTasks = [ownerTask(), fdpgTask()];

    await Promise.allSettled(emailTasks);
  }

  async handleStatusChange(proposal: Proposal, proposalUrl: string) {
    switch (proposal.status) {
      case ProposalStatus.FdpgCheck:
        const isRegistrationForm = proposal.type === ProposalType.RegisteringForm;
        return await this.sendMails(proposal, proposalUrl, [EmailRoleTargets.Researcher, EmailRoleTargets.Fdpg], {
          conditionProposalFdpgCheck: !isRegistrationForm,
          conditionProposalRegistrationCreate: isRegistrationForm,
        });
      case ProposalStatus.Rework:
        return await this.sendMails(proposal, proposalUrl, [EmailRoleTargets.Researcher], {
          conditionProposalRework: true,
        });
      case ProposalStatus.Rejected:
        return await this.sendMails(proposal, proposalUrl, [EmailRoleTargets.Researcher, EmailRoleTargets.Fdpg], {
          conditionProposalRejected: true,
        });
      case ProposalStatus.LocationCheck:
        return await this.sendMails(proposal, proposalUrl, [EmailRoleTargets.Researcher, EmailRoleTargets.Fdpg], {
          conditionProposalLocationCheck: true,
          conditionProposalUacCheck: true,
        });
      case ProposalStatus.Contracting:
        return await this.sendMails(proposal, proposalUrl, [EmailRoleTargets.Researcher], {
          conditionProposalContracting: true,
        });
      case ProposalStatus.ExpectDataDelivery:
        return await this.sendMails(proposal, proposalUrl, [EmailRoleTargets.Researcher], {
          conditionProposalDataDelivery: true,
        });
      case ProposalStatus.DataResearch:
        return await this.sendMails(proposal, proposalUrl, [EmailRoleTargets.Researcher], {
          conditionProposalDataResearch: true,
        });
      case ProposalStatus.DataResearchFinished:
        return Promise.resolve();
      case ProposalStatus.FinishedProject:
        return await this.sendMails(proposal, proposalUrl, [EmailRoleTargets.Researcher, EmailRoleTargets.Fdpg], {
          conditionProposalFinished: true,
        });
      case ProposalStatus.Archived:
        return await this.sendMails(proposal, proposalUrl, [EmailRoleTargets.Researcher, EmailRoleTargets.Fdpg], {
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
