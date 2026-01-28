import { Injectable } from '@nestjs/common';
import { EmailService } from 'src/modules/email/email.service';
import { KeycloakUtilService } from 'src/modules/user/keycloak-util.service';
import { Role } from 'src/shared/enums/role.enum';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import { Proposal } from '../../../proposal/schema/proposal.schema';
import { dizEmail, fdpgEmail } from 'src/modules/email/proposal.emails';
import { EmailCategory } from 'src/modules/email/types/email-category.enum';

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

        const mail = dizEmail(validUacContacts, proposal, [EmailCategory.ContractSign], proposalUrl, {
          conditionProposalContractSignedUser: true,
        });

        return await this.emailService.send(mail);
      };

      const fdpgTask = async () => {
        const validFdpgContacts = await this.keycloakUtilService
          .getFdpgMemberLevelContacts(proposal)
          .then((members) => members.map((member) => member.email));

        const mail = fdpgEmail(validFdpgContacts, proposal, [EmailCategory.ContractSign], proposalUrl, {
          conditionProposalContractSignedUser: true,
        });

        return await this.emailService.send(mail);
      };

      emailTasks.push(dizTask(), fdpgTask());
    }

    await Promise.allSettled(emailTasks);
  }

  async handleLocationSign(proposal: Proposal, proposalUrl: string) {
    const emailTasks: Promise<void>[] = [];

    if (proposal.isContractingComplete) {
      const fdpgTask = async () => {
        const validFdpgContacts = await this.keycloakUtilService
          .getFdpgMemberLevelContacts(proposal)
          .then((members) => members.map((member) => member.email));

        const mail = fdpgEmail(validFdpgContacts, proposal, [EmailCategory.ContractSign], proposalUrl, {
          conditionProposalContractSignedLocations: true,
        });

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
