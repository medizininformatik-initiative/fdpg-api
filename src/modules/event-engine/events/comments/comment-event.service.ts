import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommentType } from 'src/modules/comment/enums/comment-type.enum';
import { Comment } from 'src/modules/comment/schema/comment.schema';
import { EmailService } from 'src/modules/email/email.service';
import { IEmail } from 'src/modules/email/types/email.interface';
import { KeycloakUtilService } from 'src/modules/user/keycloak-util.service';
import { ALL_ACTIVE_LOCATIONS, MiiLocation } from 'src/shared/constants/mii-locations';
import { Role } from 'src/shared/enums/role.enum';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import { Proposal } from '../../../proposal/schema/proposal.schema';
import {
  getProposalMessageCreationEmailForDiz,
  getProposalMessageCreationEmailForFdpg,
  getProposalMessageCreationEmailForOwner,
  getProposalMessageCreationEmailForUac,
} from './proposal-message-creation.emails';
import {
  getProposalTaskCompletionEmailForDiz,
  getProposalTaskCompletionEmailForFdpg,
  getProposalTaskCompletionEmailForUac,
} from './proposal-task-completion.emails';
import {
  getProposalTaskCreationEmailForFdpg,
  getProposalTaskCreationEmailForOwner,
} from './proposal-task-creation.emails';
import { reduceParticipatingLocations } from 'src/shared/utils/get-participating-locations.util';

@Injectable()
export class CommentEventService {
  constructor(
    private keycloakUtilService: KeycloakUtilService,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {
    this.PREVENT_TASK_COMPLETED_BY_FDPG =
      (this.configService.get('EMAIL_SERVICE_PREVENT_TASK_COMPLETED_BY_FDPG') ?? '').toLowerCase() === 'true';
    this.PREVENT_TASK_COMPLETED_BY_OWNER =
      (this.configService.get('EMAIL_SERVICE_PREVENT_TASK_COMPLETED_BY_OWNER') ?? '').toLowerCase() === 'true';
    this.PREVENT_TASK_CREATION_FOR_OWNER =
      (this.configService.get('EMAIL_SERVICE_PREVENT_TASK_CREATION_FOR_OWNER') ?? '').toLowerCase() === 'true';
    this.PREVENT_TASK_CREATION_FOR_FDPG =
      (this.configService.get('EMAIL_SERVICE_PREVENT_TASK_CREATION_FOR_FDPG') ?? '').toLowerCase() === 'true';
    this.PREVENT_MESSAGE_TO_LOCATION_CREATION =
      (this.configService.get('EMAIL_SERVICE_PREVENT_MESSAGE_TO_LOCATION_CREATION') ?? '').toLowerCase() === 'true';
    this.PREVENT_MESSAGE_TO_FDPG_CREATION =
      (this.configService.get('EMAIL_SERVICE_PREVENT_MESSAGE_TO_FDPG_CREATION') ?? '').toLowerCase() === 'true';
    this.PREVENT_MESSAGE_TO_OWNER_CREATION =
      (this.configService.get('EMAIL_SERVICE_PREVENT_MESSAGE_TO_OWNER_CREATION') ?? '').toLowerCase() === 'true';
  }

  private PREVENT_TASK_COMPLETED_BY_FDPG: boolean;
  private PREVENT_TASK_COMPLETED_BY_OWNER: boolean;
  private PREVENT_TASK_CREATION_FOR_OWNER: boolean;
  private PREVENT_TASK_CREATION_FOR_FDPG: boolean;

  private PREVENT_MESSAGE_TO_LOCATION_CREATION: boolean;
  private PREVENT_MESSAGE_TO_FDPG_CREATION: boolean;
  private PREVENT_MESSAGE_TO_OWNER_CREATION: boolean;

  private async handleProposalTaskCreationForOwner(proposal: Proposal, comment: Comment, proposalUrl: string) {
    if (!this.PREVENT_TASK_CREATION_FOR_OWNER) {
      const validOwnerContacts = await this.keycloakUtilService.getValidContactsByUserIds([proposal.owner.id]);
      const email = getProposalTaskCreationEmailForOwner(validOwnerContacts, proposal, comment, proposalUrl);
      await this.emailService.send(email);
    }
  }

  private async handleProposalTaskCreationForFdpg(proposal: Proposal, comment: Comment, proposalUrl: string) {
    if (!this.PREVENT_TASK_CREATION_FOR_FDPG) {
      const validFdpgContacts = await this.keycloakUtilService
        .getFdpgMembers()
        .then((members) => members.map((member) => member.email));

      const email = getProposalTaskCreationEmailForFdpg(validFdpgContacts, proposal, comment, proposalUrl);
      await this.emailService.send(email);
    }
  }

  private async handleProposalTaskCompletedByOwner(proposal: Proposal, comment: Comment, proposalUrl: string) {
    if (!this.PREVENT_TASK_COMPLETED_BY_OWNER) {
      const validFdpgContacts = await this.keycloakUtilService
        .getFdpgMembers()
        .then((members) => members.map((member) => member.email));

      const email = getProposalTaskCompletionEmailForFdpg(validFdpgContacts, proposal, comment, proposalUrl);
      await this.emailService.send(email);
    }
  }

  private async handleProposalTaskCompletedByFdpg(proposal: Proposal, comment: Comment, proposalUrl: string) {
    if (!this.PREVENT_TASK_COMPLETED_BY_FDPG) {
      const locations = [comment.owner.miiLocation];

      const emails: IEmail[] = [];

      if (comment.owner.role === Role.DizMember) {
        const validDizContacts = await this.keycloakUtilService
          .getDizMembers()
          .then((members) => this.keycloakUtilService.getLocationContacts(locations, members));

        emails.push(getProposalTaskCompletionEmailForDiz(validDizContacts, proposal, comment, proposalUrl));
      } else if (comment.owner.role === Role.UacMember) {
        const validUacContacts = await this.keycloakUtilService
          .getUacMembers()
          .then((members) => this.keycloakUtilService.getLocationContacts(locations, members));
        emails.push(getProposalTaskCompletionEmailForUac(validUacContacts, proposal, comment, proposalUrl));
      }

      const emailTasks = emails.map((email) => this.emailService.send(email));
      await Promise.allSettled(emailTasks);
    }
  }

  private async handleProposalMessageToOwnerCreation(proposal: Proposal, comment: Comment, proposalUrl: string) {
    if (!this.PREVENT_MESSAGE_TO_OWNER_CREATION) {
      const validOwnerContacts = await this.keycloakUtilService.getValidContactsByUserIds([proposal.owner.id]);
      const email = getProposalMessageCreationEmailForOwner(validOwnerContacts, proposal, comment, proposalUrl);
      await this.emailService.send(email);
    }
  }

  private async handleProposalMessageToFdpgCreation(proposal: Proposal, comment: Comment, proposalUrl: string) {
    if (!this.PREVENT_MESSAGE_TO_FDPG_CREATION) {
      const validFdpgContacts = await this.keycloakUtilService
        .getFdpgMembers()
        .then((members) => members.map((member) => member.email));

      const email = getProposalMessageCreationEmailForFdpg(validFdpgContacts, proposal, comment, proposalUrl);
      await this.emailService.send(email);
    }
  }

  private async handleProposalMessageToLocationCreation(proposal: Proposal, comment: Comment, proposalUrl: string) {
    const commentLocation = comment.locations.includes(MiiLocation.VirtualAll)
      ? ALL_ACTIVE_LOCATIONS
      : (comment.locations ?? []);

    const locations = reduceParticipatingLocations(proposal, commentLocation);

    if (!this.PREVENT_MESSAGE_TO_LOCATION_CREATION) {
      const emailTasks: Promise<void>[] = [];
      if (locations.diz.length > 0) {
        const dizTask = async () => {
          const validDizContacts = await this.keycloakUtilService
            .getDizMembers()
            .then((members) => this.keycloakUtilService.getLocationContacts(locations.diz, members));
          const mail = getProposalMessageCreationEmailForDiz(validDizContacts, proposal, comment, proposalUrl);
          return await this.emailService.send(mail);
        };
        emailTasks.push(dizTask());
      }

      if (locations.uac.length > 0) {
        const uacTask = async () => {
          const validUacContacts = await this.keycloakUtilService
            .getUacMembers()
            .then((members) => this.keycloakUtilService.getLocationContacts(locations.uac, members));
          const mail = getProposalMessageCreationEmailForUac(validUacContacts, proposal, comment, proposalUrl);
          return await this.emailService.send(mail);
        };
        emailTasks.push(uacTask());
      }

      await Promise.allSettled(emailTasks);
    }
  }

  async handleCommentCreation(
    proposal: Proposal,
    comment: Comment,
    user: IRequestUser,
    proposalUrl: string,
  ): Promise<void> {
    switch (comment.type) {
      case CommentType.ProposalTask:
        return await this.handleProposalTaskCreationForOwner(proposal, comment, proposalUrl);

      case CommentType.ProposalTaskFdpg:
        return await this.handleProposalTaskCreationForFdpg(proposal, comment, proposalUrl);

      case CommentType.ProposalMessageToLocation:
        if (user.singleKnownRole === Role.FdpgMember || user.singleKnownRole === Role.DataSourceMember) {
          return await this.handleProposalMessageToLocationCreation(proposal, comment, proposalUrl);
        } else {
          return await this.handleProposalMessageToFdpgCreation(proposal, comment, proposalUrl);
        }

      case CommentType.ProposalMessageToOwner:
        if (user.singleKnownRole === Role.FdpgMember || user.singleKnownRole === Role.DataSourceMember) {
          return await this.handleProposalMessageToOwnerCreation(proposal, comment, proposalUrl);
        } else {
          return await this.handleProposalMessageToFdpgCreation(proposal, comment, proposalUrl);
        }
    }
  }

  async handleTaskCompletion(proposal: Proposal, comment: Comment, user: IRequestUser, proposalUrl: string) {
    if (
      comment.type === CommentType.ProposalTask &&
      user.singleKnownRole !== Role.FdpgMember &&
      user.singleKnownRole !== Role.DataSourceMember &&
      !this.PREVENT_TASK_COMPLETED_BY_OWNER
    ) {
      await this.handleProposalTaskCompletedByOwner(proposal, comment, proposalUrl);
    } else if (
      comment.type === CommentType.ProposalTaskFdpg &&
      (user.singleKnownRole === Role.FdpgMember || user.singleKnownRole == Role.DataSourceMember) &&
      !this.PREVENT_TASK_COMPLETED_BY_FDPG
    ) {
      await this.handleProposalTaskCompletedByFdpg(proposal, comment, proposalUrl);
    }
  }
}
