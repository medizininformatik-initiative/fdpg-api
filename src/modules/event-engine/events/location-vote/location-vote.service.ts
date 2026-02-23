import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from 'src/modules/email/email.service';
import { KeycloakUtilService } from 'src/modules/user/keycloak-util.service';
import { Proposal } from '../../../proposal/schema/proposal.schema';
import { dizEmail, fdpgEmail, researcherEmail, uacEmail } from 'src/modules/email/proposal.emails';
import { EmailCategory } from 'src/modules/email/types/email-category.enum';

@Injectable()
export class LocationVoteService {
  private readonly logger = new Logger(LocationVoteService.name);

  constructor(
    private keycloakUtilService: KeycloakUtilService,
    private emailService: EmailService,
  ) {}

  private isVotingComplete(proposal: Proposal): boolean {
    const numberOfVotedLocations = proposal.requestedButExcludedLocations.length + proposal.uacApprovedLocations.length;
    const isComplete = numberOfVotedLocations >= proposal.numberOfRequestedLocations;

    this.logger.log(
      `[VotingComplete Check] Proposal ${proposal._id}: ` +
        `Requested: ${proposal.numberOfRequestedLocations}, ` +
        `Voted: ${numberOfVotedLocations} ` +
        `(UAC Approved: ${proposal.uacApprovedLocations.length}, Excluded: ${proposal.requestedButExcludedLocations.length}) => ` +
        `Complete: ${isComplete}`,
    );

    return isComplete;
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
      this.logger.log(
        `[DizApproval] Voting complete for proposal ${proposal._id}! Sending notifications to Researcher and FDPG.`,
      );

      const researcherTask = async () => {
        try {
          const validOwnerContacts = await this.keycloakUtilService.getValidContactsByUserIds([proposal.owner.id]);
          this.logger.log(`[DizApproval] Researcher contacts for ${proposal._id}: ${validOwnerContacts.join(', ')}`);

          const mail = researcherEmail(validOwnerContacts, proposal, [EmailCategory.LocationVote], proposalUrl, {
            conditionProposalUacCheck: true,
            timestamp: proposal.deadlines.DUE_DAYS_LOCATION_CHECK,
          });

          await this.emailService.send(mail);
          this.logger.log(`[DizApproval] Successfully sent email to Researcher for proposal ${proposal._id}`);
        } catch (error) {
          this.logger.error(
            `[DizApproval] Failed to send email to Researcher for proposal ${proposal._id}`,
            error.stack,
          );
          throw error;
        }
      };

      const fdpgTask = async () => {
        try {
          const validFdpgContacts = await this.keycloakUtilService
            .getFdpgMemberLevelContacts(proposal)
            .then((members) => members.map((member) => member.email));
          this.logger.log(`[DizApproval] FDPG contacts for ${proposal._id}: ${validFdpgContacts.join(', ')}`);

          const mail = fdpgEmail(validFdpgContacts, proposal, [EmailCategory.LocationVote], proposalUrl, {
            conditionProposalUacCheck: true,
            timestamp: proposal.deadlines.DUE_DAYS_LOCATION_CHECK,
          });

          await this.emailService.send(mail);
          this.logger.log(`[DizApproval] Successfully sent email to FDPG for proposal ${proposal._id}`);
        } catch (error) {
          this.logger.error(`[DizApproval] Failed to send email to FDPG for proposal ${proposal._id}`, error.stack);
          throw error;
        }
      };

      emailTasks.push(researcherTask(), fdpgTask());
    }

    const results = await Promise.allSettled(emailTasks);
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        this.logger.error(`[DizApproval] Email task ${index} failed for proposal ${proposal._id}:`, result.reason);
      }
    });
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
      this.logger.log(
        `[UacApproval] Voting complete for proposal ${proposal._id}! Sending notifications to Researcher and FDPG.`,
      );

      const researcherTask = async () => {
        try {
          const validOwnerContacts = await this.keycloakUtilService.getValidContactsByUserIds([proposal.owner.id]);
          this.logger.log(`[UacApproval] Researcher contacts for ${proposal._id}: ${validOwnerContacts.join(', ')}`);

          const mail = researcherEmail(validOwnerContacts, proposal, [EmailCategory.LocationVote], proposalUrl, {
            conditionProposalUacCheck: true,
          });

          await this.emailService.send(mail);
          this.logger.log(`[UacApproval] Successfully sent email to Researcher for proposal ${proposal._id}`);
        } catch (error) {
          this.logger.error(
            `[UacApproval] Failed to send email to Researcher for proposal ${proposal._id}`,
            error.stack,
          );
          throw error;
        }
      };

      const fdpgTask = async () => {
        try {
          const validFdpgContacts = await this.keycloakUtilService
            .getFdpgMemberLevelContacts(proposal)
            .then((members) => members.map((member) => member.email));
          this.logger.log(`[UacApproval] FDPG contacts for ${proposal._id}: ${validFdpgContacts.join(', ')}`);

          const mail = fdpgEmail(validFdpgContacts, proposal, [EmailCategory.LocationVote], proposalUrl, {
            conditionProposalUacCheck: true,
          });

          await this.emailService.send(mail);
          this.logger.log(`[UacApproval] Successfully sent email to FDPG for proposal ${proposal._id}`);
        } catch (error) {
          this.logger.error(`[UacApproval] Failed to send email to FDPG for proposal ${proposal._id}`, error.stack);
          throw error;
        }
      };

      emailTasks.push(researcherTask(), fdpgTask());
    }

    const results = await Promise.allSettled(emailTasks);
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        this.logger.error(`[UacApproval] Email task ${index} failed for proposal ${proposal._id}:`, result.reason);
      }
    });
  }
}
