import { Injectable } from '@nestjs/common';
import { EmailService } from 'src/modules/email/email.service';
import { KeycloakUtilService } from 'src/modules/user/keycloak-util.service';
import { ProposalStatus } from '../../../proposal/enums/proposal-status.enum';
import { Proposal } from '../../../proposal/schema/proposal.schema';
import { getProposalContractingEmailForOwner } from './proposal-contracting.emails';
import {
  getProposalLocationCheckEmailForDizMembers,
  getProposalLocationCheckEmailForOwner,
} from './proposal-location-check.emails';
import { getProposalRejectEmailForOwner } from './proposal-rejected.emails';
import { getProposalReworkEmailForOwner } from './proposal-rework.emails';
import { getProposalSubmitEmailForFdpg, getProposalSubmitEmailForOwner } from './proposal-submitted.emails';

@Injectable()
export class StatusChangeService {
  constructor(
    private keycloakUtilService: KeycloakUtilService,
    private emailService: EmailService,
  ) {}

  private async handleProposalSubmit(proposal: Proposal, proposalUrl: string) {
    const ownerTask = async () => {
      const validOwnerContacts = await this.keycloakUtilService.getValidContactsByUserIds([proposal.owner.id]);
      const mail = getProposalSubmitEmailForOwner(validOwnerContacts, proposal, proposalUrl);

      return await this.emailService.send(mail);
    };

    const fdpgTask = async () => {
      const validFdpgContacts = await this.keycloakUtilService
        .getFdpgMemberLevelContacts(proposal)
        .then((members) => members.map((member) => member.email));
      const mail = getProposalSubmitEmailForFdpg(validFdpgContacts, proposal, proposalUrl);
      return await this.emailService.send(mail);
    };

    const emailTasks = [ownerTask(), fdpgTask()];

    await Promise.allSettled(emailTasks);
  }

  private async handleProposalReject(proposal: Proposal, proposalUrl: string) {
    const ownerTask = async () => {
      const validOwnerContacts = await this.keycloakUtilService.getValidContactsByUserIds([proposal.owner.id]);
      const mail = getProposalRejectEmailForOwner(validOwnerContacts, proposal, proposalUrl);
      return await this.emailService.send(mail);
    };

    const emailTasks = [ownerTask()];

    await Promise.allSettled(emailTasks);
  }

  private async handleProposalRework(proposal: Proposal, proposalUrl: string) {
    const ownerTask = async () => {
      const validOwnerContacts = await this.keycloakUtilService.getValidContactsByUserIds([proposal.owner.id]);
      const mail = getProposalReworkEmailForOwner(validOwnerContacts, proposal, proposalUrl);
      return await this.emailService.send(mail);
    };

    const emailTasks = [ownerTask()];

    await Promise.allSettled(emailTasks);
  }

  private async handleProposalLocationCheck(proposal: Proposal, proposalUrl: string) {
    const ownerTask = async () => {
      const validOwnerContacts = await this.keycloakUtilService.getValidContactsByUserIds([proposal.owner.id]);
      const mail = getProposalLocationCheckEmailForOwner(validOwnerContacts, proposal, proposalUrl);
      return await this.emailService.send(mail);
    };

    const dizTask = async () => {
      const locations = [...proposal.openDizChecks];
      const validDizContacts = await this.keycloakUtilService
        .getDizMembers()
        .then((members) => this.keycloakUtilService.getLocationContacts(locations, members));
      const mail = getProposalLocationCheckEmailForDizMembers(validDizContacts, proposal, proposalUrl);
      return await this.emailService.send(mail);
    };

    const emailTasks = [ownerTask(), dizTask()];

    await Promise.allSettled(emailTasks);
  }

  private async handleProposalContracting(proposal: Proposal, proposalUrl: string) {
    const ownerTask = async () => {
      const validOwnerContacts = await this.keycloakUtilService.getValidContactsByUserIds([proposal.owner.id]);
      const mail = getProposalContractingEmailForOwner(validOwnerContacts, proposal, proposalUrl);
      return await this.emailService.send(mail);
    };

    const emailTasks = [ownerTask()];

    await Promise.allSettled(emailTasks);
  }

  async handleStatusChange(proposal: Proposal, proposalUrl: string) {
    switch (proposal.status) {
      case ProposalStatus.FdpgCheck:
        return await this.handleProposalSubmit(proposal, proposalUrl);
      case ProposalStatus.Rework:
        return await this.handleProposalRework(proposal, proposalUrl);
      case ProposalStatus.Rejected:
        return await this.handleProposalReject(proposal, proposalUrl);
      case ProposalStatus.LocationCheck:
        return await this.handleProposalLocationCheck(proposal, proposalUrl);
      case ProposalStatus.Contracting:
        return await this.handleProposalContracting(proposal, proposalUrl);
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
