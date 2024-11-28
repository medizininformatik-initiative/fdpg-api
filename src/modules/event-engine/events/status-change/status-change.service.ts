import { Injectable } from '@nestjs/common';
import { EmailService } from 'src/modules/email/email.service';
import { KeycloakUtilService } from 'src/modules/user/keycloak-util.service';
import { ProposalStatus } from '../../../proposal/enums/proposal-status.enum';
import { Proposal } from '../../../proposal/schema/proposal.schema';
import { getProposalContractingEmailForOwner } from './proposal-contracting.emails';
import {
  getProposalLocationCheckEmailForDizMembers,
  getProposalLocationCheckEmailForOwner,
  getProposalLocationCheckEmailForParticipants,
} from './proposal-location-check.emails';
import { getProposalRejectEmailForOwner, getProposalRejectEmailForParticipants } from './proposal-rejected.emails';
import { getProposalReworkEmailForOwner } from './proposal-rework.emails';
import {
  getProposalSubmitEmailForFdpg,
  getProposalSubmitEmailForOwner,
  getProposalSubmitEmailForParticipants,
} from './proposal-submitted.emails';

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

    const participantTask = async () => {
      const participants = [...proposal.participants.map((participant) => participant.researcher.email)];
      const validParticipantsContacts = await this.keycloakUtilService.getValidContacts(participants);
      const mail = getProposalSubmitEmailForParticipants(validParticipantsContacts, proposal, proposalUrl);
      return await this.emailService.send(mail);
    };

    const fdpgTask = async () => {
      const validFdpgContacts = await this.keycloakUtilService
        .getFdpgMembers()
        .then((members) => members.map((member) => member.email));
      const mail = getProposalSubmitEmailForFdpg(validFdpgContacts, proposal, proposalUrl);
      return await this.emailService.send(mail);
    };

    const emailTasks = [ownerTask(), participantTask(), fdpgTask()];

    await Promise.allSettled(emailTasks);
  }

  private async handleProposalReject(proposal: Proposal, proposalUrl: string) {
    const ownerTask = async () => {
      const validOwnerContacts = await this.keycloakUtilService.getValidContactsByUserIds([proposal.owner.id]);
      const mail = getProposalRejectEmailForOwner(validOwnerContacts, proposal, proposalUrl);
      return await this.emailService.send(mail);
    };

    const participantTask = async () => {
      const participants = [...proposal.participants.map((participant) => participant.researcher.email)];
      const validParticipantsContacts = await this.keycloakUtilService.getValidContacts(participants);
      const mail = getProposalRejectEmailForParticipants(validParticipantsContacts, proposal, proposalUrl);
      return await this.emailService.send(mail);
    };

    const emailTasks = [ownerTask(), participantTask()];

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

    const participantTask = async () => {
      const participants = [...proposal.participants.map((participant) => participant.researcher.email)];
      const validParticipantsContacts = await this.keycloakUtilService.getValidContacts(participants);
      const mail = getProposalLocationCheckEmailForParticipants(validParticipantsContacts, proposal, proposalUrl);
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

    const emailTasks = [ownerTask(), participantTask(), dizTask()];

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

      default:
        break;
    }
  }
}
