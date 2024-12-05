import { Injectable } from '@nestjs/common';
import { EmailService } from 'src/modules/email/email.service';
import { KeycloakUtilService } from 'src/modules/user/keycloak-util.service';
import { Role } from 'src/shared/enums/role.enum';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import { Proposal } from '../../../proposal/schema/proposal.schema';
import { getResearcherSignedEmailForDizMembers, getSigningCompleteEmailForFdpgMember } from './contracting.emails';

@Injectable()
export class ContractingService {
  constructor(
    private keycloakUtilService: KeycloakUtilService,
    private emailService: EmailService,
  ) {}

  private async handleResearcherSign(proposal: Proposal, vote: boolean, proposalUrl: string) {
    const emailTasks: Promise<void>[] = [];
    if (vote === true) {
      const dizTask = async () => {
        const locations = [...proposal.uacApprovedLocations];
        const validUacContacts = await this.keycloakUtilService
          .getDizMembers()
          .then((members) => this.keycloakUtilService.getLocationContacts(locations, members));
        const mail = getResearcherSignedEmailForDizMembers(validUacContacts, proposal, proposalUrl);
        return await this.emailService.send(mail);
      };
      emailTasks.push(dizTask());
    }

    await Promise.allSettled(emailTasks);
  }

  private async handleLocationSign(proposal: Proposal, proposalUrl: string) {
    const emailTasks: Promise<void>[] = [];

    if (proposal.isContractingComplete) {
      const fdpgTask = async () => {
        const validFdpgContacts = await this.keycloakUtilService
          .getFdpgMembers()
          .then((members) => members.map((member) => member.email));
        const mail = getSigningCompleteEmailForFdpgMember(validFdpgContacts, proposal, proposalUrl);
        return await this.emailService.send(mail);
      };

      emailTasks.push(fdpgTask());
    }

    await Promise.allSettled(emailTasks);
  }

  async handleContractSign(proposal: Proposal, vote: boolean, user: IRequestUser, proposalUrl: string) {
    if (user.singleKnownRole === Role.Researcher) {
      await this.handleResearcherSign(proposal, vote, proposalUrl);
    } else if (user.isFromLocation) {
      await this.handleLocationSign(proposal, proposalUrl);
    }
  }
}
