import { Injectable } from '@nestjs/common';
import { EmailService } from 'src/modules/email/email.service';
import { KeycloakUtilService } from 'src/modules/user/keycloak-util.service';
import { ProposalWithoutContent } from '../../types/proposal-without-content.type';
import { HistoryEventType } from 'src/modules/proposal/enums/history-event.enum';
import { buildParticipatingEmailSummary } from 'src/modules/email/proposal.emails';

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
    if (proposal.participants.length === 0 && !proposal.projectResponsible.researcher) {
      return;
    }

    const relevantChanges = proposal.history
      .filter((historyEntry) => this.relevantHistoryItems.has(historyEntry.type))
      .filter((historyEntry) => fromDateTime.getTime() <= historyEntry.createdAt.getTime())
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    if (relevantChanges.length === 0) {
      return;
    }

    const changes = relevantChanges.map((change) => change.type);

    await this.sendMails(proposal, changes, proposalUrl);
  }

  private async sendMails(proposal: ProposalWithoutContent, mailBodyChanges: HistoryEventType[], proposalUrl: string) {
    const emailTasks: Promise<void>[] = [];

    const participantTask = async () => {
      const participants = [
        ...proposal.participants.map((participant) => participant.researcher.email),
        proposal.projectResponsible?.researcher?.email,
      ].filter((participant) => participant);
      const validParticipantsContacts = await this.keycloakUtilService.getValidContacts(participants);

      const mail = buildParticipatingEmailSummary(validParticipantsContacts, mailBodyChanges, proposal, proposalUrl);

      return await this.emailService.send(mail);
    };

    emailTasks.push(participantTask());

    await Promise.allSettled(emailTasks);
  }
}
