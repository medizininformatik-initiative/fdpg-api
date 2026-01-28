import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Document, Model } from 'mongoose';
import { Comment } from 'src/modules/comment/schema/comment.schema';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import { ProposalStatus } from '../proposal/enums/proposal-status.enum';
import { Proposal, ProposalDocument } from '../proposal/schema/proposal.schema';
import { Schedule } from '../scheduler/schema/schedule.schema';
import { CommentEventService } from './events/comments/comment-event.service';
import { ContractingService } from './events/contracting/contracting.service';
import { LocationVoteService } from './events/location-vote/location-vote.service';
import { ProposalLockService } from './events/proposal-lock/proposal-lock.service';
import { StatusChangeService } from './events/status-change/status-change.service';
import { StatusReminderService } from './events/status-reminder/status-reminder.service';
import { ReportDto } from '../proposal/dto/proposal/report.dto';
import { PublicationCreateDto, PublicationUpdateDto } from '../proposal/dto/proposal/publication.dto';
import { Answer } from '../comment/schema/answer.schema';
import { CommentAnswerEventService } from './events/comments/comment-answer-event.service';
import { CommentType } from '../comment/enums/comment-type.enum';
import { DeadlineEventService } from './events/deadlines/deadline-event.service';
import { DueDateEnum } from '../proposal/enums/due-date.enum';
import { ParticipantEmailSummaryService } from './events/summary/participant-email-summary.service';
import { DataDeliveryEventService } from './events/data-delivery/data-delivery-event.service';
import { Location } from '../location/schema/location.schema';
import { PublicationNotificationService } from './events/publications/publication-notification.service';
import { ReportNotificationService } from './events/reports/report-notification.service';

type MongoDocument = Document<any, any, any> & { _id: any };
type ProposalMeta = Omit<Proposal, 'userProject'>;
type ProposalMetaDocument = Promise<ProposalMeta & MongoDocument>;

@Injectable()
export class EventEngineService {
  constructor(
    @InjectModel(Proposal.name)
    private proposalModel: Model<ProposalDocument>,
    private statusChangeService: StatusChangeService,
    private proposalLockService: ProposalLockService,
    private statusReminderService: StatusReminderService,
    private commentEventService: CommentEventService,
    private commentAnswerEventService: CommentAnswerEventService,
    private locationVoteService: LocationVoteService,
    private contractingService: ContractingService,
    private reportNotificationService: ReportNotificationService,
    private publicationNotificationService: PublicationNotificationService,
    private configService: ConfigService,
    private deadlineEventService: DeadlineEventService,
    private participantEmailSummaryService: ParticipantEmailSummaryService,
    private dataDeliveryEventService: DataDeliveryEventService,
  ) {
    this.portalHost = this.configService.get('PORTAL_HOST');
  }

  private portalHost: string;

  private getProposalUrl(proposal: Pick<Proposal, '_id'>) {
    return `${this.portalHost}/proposals/${proposal._id}/details`;
  }

  private async getProposalMetaDataById(proposalId: string): ProposalMetaDocument {
    return this.proposalModel.findById(proposalId, { userProject: 0 });
  }

  async handleProposalStatusChange(proposal: Proposal) {
    if (proposal) {
      const proposalUrl = this.getProposalUrl(proposal);
      await this.statusChangeService.handleStatusChange(proposal, proposalUrl);
    }
  }

  async handleProposalLockChange(proposal: Proposal) {
    if (proposal) {
      const proposalUrl = this.getProposalUrl(proposal);
      await this.proposalLockService.handleProposalLockChange(proposal, proposalUrl);
    }
  }

  async handleProposalStatusSchedule(event: Schedule) {
    const proposal = await this.getProposalMetaDataById(event.referenceDocumentId);
    if (proposal) {
      const proposalUrl = this.getProposalUrl(proposal);
      await this.statusReminderService.handleStatusReminder(proposal, proposalUrl, event);

      proposal.scheduledEvents = proposal.scheduledEvents.filter(
        (eventsOnProposal) => eventsOnProposal.scheduleId !== event._id.toString(),
      );
      await proposal.save();
    }
  }

  async handleProposalDizApproval(proposal: Proposal, vote: boolean, location: string) {
    if (proposal) {
      const proposalUrl = this.getProposalUrl(proposal);
      await this.locationVoteService.handleDizApproval(proposal, vote, location, proposalUrl);
    }
  }

  async handleProposalUacApproval(proposal: Proposal, vote: boolean, location: string) {
    if (proposal) {
      const proposalUrl = this.getProposalUrl(proposal);
      await this.locationVoteService.handleUacApproval(proposal, vote, location, proposalUrl);
    }
  }

  async handleProposalContractSign(proposal: Proposal, vote: boolean, user: IRequestUser) {
    if (proposal) {
      const proposalUrl = this.getProposalUrl(proposal);
      await this.contractingService.handleContractSign(proposal, vote, user, proposalUrl);
    }
  }

  async handleProposalContractingSkip(proposal: Proposal) {
    if (proposal) {
      const proposalUrl = this.getProposalUrl(proposal);
      await this.contractingService.handleLocationSign(proposal, proposalUrl);
    }
  }

  async handleProposalCommentCreation(proposal: Proposal, comment: Comment, user: IRequestUser) {
    if (
      (proposal && comment && user && proposal.status !== ProposalStatus.Draft) ||
      (proposal.status === ProposalStatus.Draft && comment.type === CommentType.ProposalMessageToOwner)
    ) {
      const proposalUrl = this.getProposalUrl(proposal);
      await this.commentEventService.handleCommentCreation(proposal, comment, user, proposalUrl);
    }
  }

  async handleProposalCommentAnswerCreation(proposal: Proposal, comment: Comment, answer: Answer, user: IRequestUser) {
    if (
      (proposal && answer && user && proposal.status !== ProposalStatus.Draft) ||
      (proposal.status === ProposalStatus.Draft && comment.type === CommentType.ProposalMessageToOwner)
    ) {
      const proposalUrl = this.getProposalUrl(proposal);
      await this.commentAnswerEventService.handleCommentAnswerCreation(proposal, comment, answer, user, proposalUrl);
    }
  }

  async handleProposalTaskCompletion(proposal: Proposal, comment: Comment, user: IRequestUser) {
    if (proposal && comment && user) {
      const proposalUrl = this.getProposalUrl(proposal);
      await this.commentEventService.handleTaskCompletion(proposal, comment, user, proposalUrl);
    }
  }

  async handleProposalReportCreate(proposal: Proposal, report: ReportDto) {
    if (proposal && report) {
      const proposalUrl = this.getProposalUrl(proposal);
      await this.reportNotificationService.handleReportCreate(proposal, report, proposalUrl);
    }
  }

  async handleProposalPublicationCreate(proposal: Proposal, publication: PublicationCreateDto) {
    if (proposal && publication) {
      const proposalUrl = this.getProposalUrl(proposal);
      await this.publicationNotificationService.handlePublicationCreate(proposal, publication, proposalUrl);
    }
  }

  async handleProposalPublicationUpdate(proposal: Proposal, publicationId: string, publication: PublicationUpdateDto) {
    if (proposal && publication) {
      const proposalUrl = this.getProposalUrl(proposal);
      await this.publicationNotificationService.handlePublicationUpdate(proposal, publication, proposalUrl);
    }
  }

  async handleDeadlineChange(proposal: Proposal, changeList: Record<DueDateEnum, Date | null>) {
    const proposalUrl = this.getProposalUrl(proposal);
    await this.deadlineEventService.sendForDeadlineChange(proposal, changeList, proposalUrl);
  }

  async handleDataDeliveryInitiated(proposal: Proposal, locations: Location[]) {
    const proposalUrl = this.getProposalUrl(proposal);
    await this.dataDeliveryEventService.handleDataDeliveryInitiated(proposal, proposalUrl, locations);
  }

  async handleDataDeliveryDataReady(proposal: Proposal, locations: Location[]) {
    const proposalUrl = this.getProposalUrl(proposal);
    await this.dataDeliveryEventService.handleDataDeliveryDataReady(proposal, proposalUrl, locations);
  }

  async handleDataDeliveryDataReturn(proposal: Proposal) {
    const proposalUrl = this.getProposalUrl(proposal);
    await this.dataDeliveryEventService.handleDataDeliveryDataReturn(proposal, proposalUrl);
  }

  async handleParticipatingResearcherSummarySchedule(event: Schedule) {
    const proposal = await this.getProposalMetaDataById(event.referenceDocumentId);
    if (proposal) {
      const proposalUrl = this.getProposalUrl(proposal);
      const fromDate = new Date(event.dueAfter);
      fromDate.setDate(fromDate.getDate() - 1);
      fromDate.setHours(0, 0, 0, 0);
      await this.participantEmailSummaryService.handleParticipatingScientistSummary(proposal, proposalUrl, fromDate);

      proposal.scheduledEvents = proposal.scheduledEvents.filter(
        (eventsOnProposal) => eventsOnProposal.scheduleId !== event._id.toString(),
      );
      await proposal.save();
    }
  }
}
