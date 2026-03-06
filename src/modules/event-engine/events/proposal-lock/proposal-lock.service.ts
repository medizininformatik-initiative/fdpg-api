import { Injectable } from '@nestjs/common';
import { EmailService } from 'src/modules/email/email.service';
import { KeycloakUtilService } from 'src/modules/user/keycloak-util.service';
import { Proposal } from '../../../proposal/schema/proposal.schema';
import { researcherEmail } from 'src/modules/email/proposal.emails';
import { EmailCategory } from 'src/modules/email/types/email-category.enum';

@Injectable()
export class ProposalLockService {
  constructor(
    private keycloakUtilService: KeycloakUtilService,
    private emailService: EmailService,
  ) {}

  private async handleProposalLock(proposal: Proposal, proposalUrl: string) {
    const ownerTask = async () => {
      const validOwnerContacts = await this.keycloakUtilService.getValidContactsByUserIds([proposal.owner.id]);
      const mail = researcherEmail(validOwnerContacts, proposal, [EmailCategory.ProposalLock], proposalUrl, {
        conditionProposalLocked: true,
      });
      return await this.emailService.send(mail);
    };

    const emailTasks = [ownerTask()];

    await Promise.allSettled(emailTasks);
  }

  private async handleProposalUnlock(proposal: Proposal, proposalUrl: string) {
    const ownerTask = async () => {
      const validOwnerContacts = await this.keycloakUtilService.getValidContactsByUserIds([proposal.owner.id]);
      const mail = researcherEmail(validOwnerContacts, proposal, [EmailCategory.ProposalLock], proposalUrl, {
        conditionProposalUnlocked: true,
      });
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
