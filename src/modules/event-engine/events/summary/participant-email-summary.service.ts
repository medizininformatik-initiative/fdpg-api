import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from 'src/modules/email/email.service';
import { KeycloakUtilService } from 'src/modules/user/keycloak-util.service';
import { ProposalWithoutContent } from '../../types/proposal-without-content.type';
import { HistoryEventType } from 'src/modules/proposal/enums/history-event.enum';
import { buildParticipatingEmailSummary } from 'src/modules/email/proposal.emails';

@Injectable()
export class ParticipantEmailSummaryService {
  private readonly logger = new Logger(ParticipantEmailSummaryService.name);

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
    HistoryEventType.ProposalArchived, // move to archived

    HistoryEventType.DataDeliveryStarted, // A new DSF Data Delivery was initiated
  ]);

  async handleParticipatingScientistSummary(proposal: ProposalWithoutContent, proposalUrl: string, fromDateTime: Date) {
    this.logger.log(`[ParticipantSummary] Processing proposal ${proposal._id}`);

    if (proposal.participants.length === 0 && !proposal.projectResponsible.researcher) {
      this.logger.warn(`[ParticipantSummary] Skipping proposal ${proposal._id}: No participants`);
      return;
    }

    const relevantChanges = proposal.history
      .filter((historyEntry) => this.relevantHistoryItems.has(historyEntry.type))
      .filter((historyEntry) => fromDateTime.getTime() <= historyEntry.createdAt.getTime())
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    if (relevantChanges.length === 0) {
      this.logger.warn(`[ParticipantSummary] Skipping proposal ${proposal._id}: No relevant history changes`);
      return;
    }

    const changes = relevantChanges.map((change) => change.type);

    await this.sendMails(proposal, changes, proposalUrl);

    this.logger.log(`[ParticipantSummary] Successfully sent email for proposal ${proposal._id}`);
  }

  private async sendMails(proposal: ProposalWithoutContent, mailBodyChanges: HistoryEventType[], proposalUrl: string) {
    const emailTasks: Promise<void>[] = [];

    const participantTask = async () => {
      try {
        const participants = [
          ...proposal.participants.map((participant) => participant.researcher.email),
          proposal.projectResponsible?.researcher?.email,
        ].filter((participant) => participant);

        if (participants.length === 0) {
          this.logger.warn(`[ParticipantSummary] No participant emails found for proposal ${proposal._id}`);
          return;
        }

        const mail = buildParticipatingEmailSummary(participants, mailBodyChanges, proposal, proposalUrl);

        await this.emailService.send(mail);
      } catch (error) {
        this.logger.error(
          `[ParticipantSummary] Failed to send email for proposal ${proposal._id}`,
          error.stack,
        );
        throw error;
      }
    };

    emailTasks.push(participantTask());

    await Promise.allSettled(emailTasks);
  }
}
