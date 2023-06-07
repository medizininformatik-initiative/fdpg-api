import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommentType } from 'src/modules/comment/enums/comment-type.enum';
import { Comment } from 'src/modules/comment/schema/comment.schema';
import { EmailService } from 'src/modules/email/email.service';
import { KeycloakUtilService } from 'src/modules/user/keycloak-util.service';
import { ALL_ACTIVE_LOCATIONS, MiiLocation } from 'src/shared/constants/mii-locations';
import { Role } from 'src/shared/enums/role.enum';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import { Proposal } from '../../../proposal/schema/proposal.schema';
import {
  getProposalMessageAnswerCreationEmailForDiz,
  getProposalMessageAnswerCreationEmailForFdpg,
  getProposalMessageAnswerCreationEmailForOwner,
  getProposalMessageAnswerCreationEmailForUac,
} from './proposal-message-answer-creation.emails';
import { reduceParticipatingLocations } from 'src/shared/utils/get-participating-locations.util';
import { Answer } from 'src/modules/comment/schema/answer.schema';

@Injectable()
export class CommentAnswerEventService {
  constructor(
    private keycloakUtilService: KeycloakUtilService,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {
    this.PREVENT_MESSAGE_TO_LOCATION_ANSWER =
      (this.configService.get('EMAIL_SERVICE_PREVENT_MESSAGE_TO_LOCATION_ANSWER') ?? '').toLowerCase() === 'true';
    this.PREVENT_MESSAGE_TO_FDPG_ANSWER =
      (this.configService.get('EMAIL_SERVICE_PREVENT_MESSAGE_TO_FDPG_ANSWER') ?? '').toLowerCase() === 'true';
    this.PREVENT_MESSAGE_TO_OWNER_ANSWER =
      (this.configService.get('EMAIL_SERVICE_PREVENT_MESSAGE_TO_OWNER_ANSWER') ?? '').toLowerCase() === 'true';
  }

  private PREVENT_MESSAGE_TO_LOCATION_ANSWER: boolean;
  private PREVENT_MESSAGE_TO_FDPG_ANSWER: boolean;
  private PREVENT_MESSAGE_TO_OWNER_ANSWER: boolean;

  private async handleProposalMessageToOwnerCreation(
    proposal: Proposal,
    comment: Comment,
    answer: Answer,
    proposalUrl: string,
  ) {
    if (!this.PREVENT_MESSAGE_TO_OWNER_ANSWER) {
      const validOwnerContacts = await this.keycloakUtilService.getValidContactsByUserIds([proposal.owner.id]);
      const email = getProposalMessageAnswerCreationEmailForOwner(
        validOwnerContacts,
        proposal,
        comment,
        answer,
        proposalUrl,
      );
      await this.emailService.send(email);
    }
  }

  private async handleProposalMessageToFdpgCreation(
    proposal: Proposal,
    comment: Comment,
    answer: Answer,
    proposalUrl: string,
  ) {
    if (!this.PREVENT_MESSAGE_TO_FDPG_ANSWER) {
      const validFdpgContacts = await this.keycloakUtilService
        .getFdpgMembers()
        .then((members) => members.map((member) => member.email));

      const email = getProposalMessageAnswerCreationEmailForFdpg(
        validFdpgContacts,
        proposal,
        comment,
        answer,
        proposalUrl,
      );
      await this.emailService.send(email);
    }
  }

  private async handleProposalMessageToLocationCreation(
    proposal: Proposal,
    comment: Comment,
    answer: Answer,
    proposalUrl: string,
  ) {
    const commentLocation = answer.locations.includes(MiiLocation.VirtualAll)
      ? ALL_ACTIVE_LOCATIONS
      : answer.locations ?? [];

    const locations = reduceParticipatingLocations(proposal, commentLocation);

    if (!this.PREVENT_MESSAGE_TO_LOCATION_ANSWER) {
      const emailTasks: Promise<void>[] = [];
      if (locations.diz.length > 0) {
        const dizTask = async () => {
          const validDizContacts = await this.keycloakUtilService
            .getDizMembers()
            .then((members) => this.keycloakUtilService.getLocationContacts(locations.diz, members));
          const mail = getProposalMessageAnswerCreationEmailForDiz(
            validDizContacts,
            proposal,
            comment,
            answer,
            proposalUrl,
          );
          return await this.emailService.send(mail);
        };
        emailTasks.push(dizTask());
      }

      if (locations.uac.length > 0) {
        const uacTask = async () => {
          const validUacContacts = await this.keycloakUtilService
            .getUacMembers()
            .then((members) => this.keycloakUtilService.getLocationContacts(locations.uac, members));
          const mail = getProposalMessageAnswerCreationEmailForUac(
            validUacContacts,
            proposal,
            comment,
            answer,
            proposalUrl,
          );
          return await this.emailService.send(mail);
        };
        emailTasks.push(uacTask());
      }

      await Promise.allSettled(emailTasks);
    }
  }

  async handleCommentAnswerCreation(
    proposal: Proposal,
    comment: Comment,
    answer: Answer,
    user: IRequestUser,
    proposalUrl: string,
  ): Promise<void> {
    switch (comment.type) {
      case CommentType.ProposalMessageToLocation:
        if (user.singleKnownRole === Role.FdpgMember) {
          return await this.handleProposalMessageToLocationCreation(proposal, comment, answer, proposalUrl);
        } else {
          return await this.handleProposalMessageToFdpgCreation(proposal, comment, answer, proposalUrl);
        }

      case CommentType.ProposalMessageToOwner:
        if (user.singleKnownRole === Role.FdpgMember) {
          return await this.handleProposalMessageToOwnerCreation(proposal, comment, answer, proposalUrl);
        } else {
          return await this.handleProposalMessageToFdpgCreation(proposal, comment, answer, proposalUrl);
        }
    }
  }
}
