import { Injectable } from '@nestjs/common';
import { EmailService } from 'src/modules/email/email.service';
import { KeycloakUtilService } from 'src/modules/user/keycloak-util.service';
import { Proposal } from '../../../proposal/schema/proposal.schema';
import { dizEmail, fdpgEmail, uacEmail } from 'src/modules/email/proposal.emails';
import { EmailCategory } from 'src/modules/email/types/email-category.enum';

@Injectable()
export class LocationVoteService {
  constructor(
    private keycloakUtilService: KeycloakUtilService,
    private emailService: EmailService,
  ) {}

  private isVotingComplete(proposal: Proposal): boolean {
    const numberOfVotedLocations = proposal.requestedButExcludedLocations.length + proposal.uacApprovedLocations.length;
    return numberOfVotedLocations >= proposal.numberOfRequestedLocations;
  }

  async handleDizApproval(proposal: Proposal, vote: boolean, location: string, proposalUrl: string) {
    const emailTasks: Promise<void>[] = [];

    if (vote === true) {
      const uacTask = async () => {
        const validUacContacts = await this.keycloakUtilService
          .getUacMembers()
          .then((members) => this.keycloakUtilService.getLocationContacts([location], members));

        const mail = uacEmail(validUacContacts, proposal, [EmailCategory.LocationVote], proposalUrl, {
          conditionProposalLocationCheckDizForward: true,
          timestamp: proposal.deadlines.DUE_DAYS_LOCATION_CHECK,
        });

        return await this.emailService.send(mail);
      };

      emailTasks.push(uacTask());
    }

    if (this.isVotingComplete(proposal)) {
      const fdpgTask = async () => {
        const validFdpgContacts = await this.keycloakUtilService
          .getFdpgMemberLevelContacts(proposal)
          .then((members) => members.map((member) => member.email));

        const mail = fdpgEmail(validFdpgContacts, proposal, [EmailCategory.LocationVote], proposalUrl, {
          conditionProposalUacCheck: true,
          timestamp: proposal.deadlines.DUE_DAYS_LOCATION_CHECK,
        });

        return await this.emailService.send(mail);
      };

      emailTasks.push(fdpgTask());
    }

    await Promise.allSettled(emailTasks);
  }

  async handleUacApproval(proposal: Proposal, vote: boolean, location: string, proposalUrl: string) {
    const emailTasks: Promise<void>[] = [];

    if (vote === true) {
      const dizTask = async () => {
        const validDizContacts = await this.keycloakUtilService
          .getDizMembers()
          .then((members) => this.keycloakUtilService.getLocationContacts([location], members));

        const mail = dizEmail(validDizContacts, proposal, [EmailCategory.LocationVote], proposalUrl, {
          conditionProposalLocalUacCheck: true,
        });

        return await this.emailService.send(mail);
      };
      emailTasks.push(dizTask());
    }

    if (this.isVotingComplete(proposal)) {
      const fdpgTask = async () => {
        const validFdpgContacts = await this.keycloakUtilService
          .getFdpgMemberLevelContacts(proposal)
          .then((members) => members.map((member) => member.email));

        const mail = fdpgEmail(validFdpgContacts, proposal, [EmailCategory.LocationVote], proposalUrl, {
          conditionProposalUacCheck: true,
        });

        return await this.emailService.send(mail);
      };

      emailTasks.push(fdpgTask());
    }

    await Promise.allSettled(emailTasks);
  }
}
