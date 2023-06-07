import { Injectable } from '@nestjs/common';
import { EmailService } from 'src/modules/email/email.service';
import { KeycloakUtilService } from 'src/modules/user/keycloak-util.service';
import { MiiLocation } from 'src/shared/constants/mii-locations';
import { Proposal } from '../../../proposal/schema/proposal.schema';
import { getDizApprovalEmailForUacMembers, getVotingCompleteEmailForFdpgMember } from './location-approval.emails';

@Injectable()
export class LocationVoteService {
  constructor(private keycloakUtilService: KeycloakUtilService, private emailService: EmailService) {}

  private isVotingComplete(proposal: Proposal): boolean {
    const numberOfVotedLocations = proposal.requestedButExcludedLocations.length + proposal.uacApprovedLocations.length;
    return numberOfVotedLocations >= proposal.numberOfRequestedLocations;
  }

  async handleDizApproval(proposal: Proposal, vote: boolean, location: MiiLocation, proposalUrl: string) {
    const emailTasks: Promise<void>[] = [];
    if (vote === true) {
      const uacTask = async () => {
        const validUacContacts = await this.keycloakUtilService
          .getUacMembers()
          .then((members) => this.keycloakUtilService.getLocationContacts([location], members));
        const mail = getDizApprovalEmailForUacMembers(validUacContacts, proposal, proposalUrl);
        return await this.emailService.send(mail);
      };
      emailTasks.push(uacTask());
    }

    if (this.isVotingComplete(proposal)) {
      const fdpgTask = async () => {
        const validFdpgContacts = await this.keycloakUtilService
          .getFdpgMembers()
          .then((members) => members.map((member) => member.email));
        const mail = getVotingCompleteEmailForFdpgMember(validFdpgContacts, proposal, proposalUrl);
        return await this.emailService.send(mail);
      };

      emailTasks.push(fdpgTask());
    }

    await Promise.allSettled(emailTasks);
  }

  async handleUacApproval(proposal: Proposal, vote: boolean, location: MiiLocation, proposalUrl: string) {
    const emailTasks: Promise<void>[] = [];

    if (this.isVotingComplete(proposal)) {
      const fdpgTask = async () => {
        const validFdpgContacts = await this.keycloakUtilService
          .getFdpgMembers()
          .then((members) => members.map((member) => member.email));
        const mail = getVotingCompleteEmailForFdpgMember(validFdpgContacts, proposal, proposalUrl);
        return await this.emailService.send(mail);
      };

      emailTasks.push(fdpgTask());
    }

    await Promise.allSettled(emailTasks);
  }
}
