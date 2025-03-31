import { Injectable } from '@nestjs/common';
import { EmailService } from 'src/modules/email/email.service';
import { KeycloakUtilService } from 'src/modules/user/keycloak-util.service';
import { ProposalWithoutContent } from '../../types/proposal-without-content.type';
import { HistoryEventType } from 'src/modules/proposal/enums/history-event.enum';
import { getProposalRejectEmailForParticipantsBody } from '../status-change/proposal-rejected.emails';
import { getProposalLocationCheckEmailForParticipantsBody } from '../status-change/proposal-location-check.emails';
import { getProposalContractingEmailForOwnerBody } from '../status-change/proposal-contracting.emails';
import { getProposalSubmitEmailForParticipantsBody } from '../status-change/proposal-submitted.emails';
import { buildParticipatingEmailSummary } from './participating-email-summary.email';

@Injectable()
export class ParticipantEmailSummaryService {
  constructor(
    private keycloakUtilService: KeycloakUtilService,
    private emailService: EmailService,
  ) {}

  private relevantHistoryItems: Set<HistoryEventType> = new Set([
    HistoryEventType.ProposalRejected,
    HistoryEventType.ProposalFdpgCheck, // move to fdpg check
    HistoryEventType.ProposalLocationCheck, // move to locations
    HistoryEventType.ProposalContracting, // uac done
    HistoryEventType.ProposalDataDelivery, // contracting done
    HistoryEventType.ProposalDataResearch, // move to data research
    HistoryEventType.ProposalFinished, // move to project finished
  ]);

  async handleParticipatingScientistSummary(proposal: ProposalWithoutContent, proposalUrl: string, fromDateTime: Date) {
    if (proposal.participants.length === 0) {
      return;
    }

    const relevantChanges = proposal.history
      .filter((historyEntry) => this.relevantHistoryItems.has(historyEntry.type))
      .filter((historyEntry) => fromDateTime.getTime() <= historyEntry.createdAt.getTime())
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    if (relevantChanges.length === 0) {
      return;
    }

    const changes = relevantChanges
      .map((change) => this.mapHistoryEventTypeToMailBody(change.type, proposal))
      .filter((change) => change);

    await this.sendMails(proposal, changes, proposalUrl);
  }

  private async sendMails(proposal: ProposalWithoutContent, mailBodyChanges: string[], proposalUrl: string) {
    const emailTasks: Promise<void>[] = [];

    const participantTask = async () => {
      const participants = [...proposal.participants.map((participant) => participant.researcher.email)];
      const validParticipantsContacts = await this.keycloakUtilService.getValidContacts(participants);

      const mail = buildParticipatingEmailSummary(validParticipantsContacts, mailBodyChanges, proposal, proposalUrl);
      return await this.emailService.send(mail);
    };

    emailTasks.push(participantTask());

    await Promise.allSettled(emailTasks);
  }

  private mapHistoryEventTypeToMailBody(
    historyEventType: HistoryEventType,
    proposal: ProposalWithoutContent,
  ): string | null {
    switch (historyEventType) {
      case HistoryEventType.ProposalRejected:
        return getProposalRejectEmailForParticipantsBody(proposal);
      case HistoryEventType.ProposalFdpgCheck:
        return getProposalSubmitEmailForParticipantsBody(proposal);
      case HistoryEventType.ProposalLocationCheck:
        return getProposalLocationCheckEmailForParticipantsBody(proposal);
      case HistoryEventType.ProposalContracting:
        return getProposalContractingEmailForOwnerBody(proposal);
      case HistoryEventType.ProposalDataDelivery:
      case HistoryEventType.ProposalDataResearch:
      case HistoryEventType.ProposalFinished:

      default:
        return null;
    }
  }
}
