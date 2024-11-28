import { Injectable } from '@nestjs/common';
import { EmailService } from 'src/modules/email/email.service';
import { KeycloakUtilService } from 'src/modules/user/keycloak-util.service';
import { Proposal } from '../../../proposal/schema/proposal.schema';
import { getProposalLockedEmailForOwner, getProposalUnlockedEmailForOwner } from './proposal-lock.emails';

@Injectable()
export class ProposalLockService {
  constructor(
    private keycloakUtilService: KeycloakUtilService,
    private emailService: EmailService,
  ) {}

  private async handleProposalLock(proposal: Proposal, proposalUrl: string) {
    const ownerTask = async () => {
      const validOwnerContacts = await this.keycloakUtilService.getValidContactsByUserIds([proposal.owner.id]);
      const mail = getProposalLockedEmailForOwner(validOwnerContacts, proposal, proposalUrl);
      return await this.emailService.send(mail);
    };

    const emailTasks = [ownerTask()];

    await Promise.allSettled(emailTasks);
  }

  private async handleProposalUnlock(proposal: Proposal, proposalUrl: string) {
    const ownerTask = async () => {
      const validOwnerContacts = await this.keycloakUtilService.getValidContactsByUserIds([proposal.owner.id]);
      const mail = getProposalUnlockedEmailForOwner(validOwnerContacts, proposal, proposalUrl);
      return await this.emailService.send(mail);
    };

    const emailTasks = [ownerTask()];

    await Promise.allSettled(emailTasks);
  }

  async handleProposalLockChange(proposal: Proposal, proposalUrl: string) {
    if (proposal.isLocked) {
      await this.handleProposalLock(proposal, proposalUrl);
    } else {
      await this.handleProposalUnlock(proposal, proposalUrl);
    }
  }
}
