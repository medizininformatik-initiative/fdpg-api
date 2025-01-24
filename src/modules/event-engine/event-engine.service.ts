import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Document, Model } from 'mongoose';
import { Comment } from 'src/modules/comment/schema/comment.schema';
import { MiiLocation } from 'src/shared/constants/mii-locations';
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
import { ReportsService } from './events/reports/reports.service';
import { ReportDto } from '../proposal/dto/proposal/report.dto';
import { PublicationCreateDto, PublicationUpdateDto } from '../proposal/dto/proposal/publication.dto';
import { Publication } from '../proposal/schema/sub-schema/publication.schema';
import { PublicationsService } from './events/publications/publications.service';
import { Answer } from '../comment/schema/answer.schema';
import { CommentAnswerEventService } from './events/comments/comment-answer-event.service';
import { CommentType } from '../comment/enums/comment-type.enum';

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
    private reportsService: ReportsService,
    private publicationsService: PublicationsService,
    private configService: ConfigService,
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

  async handleProposalDizApproval(proposal: Proposal, vote: boolean, location: MiiLocation) {
    if (proposal) {
      const proposalUrl = this.getProposalUrl(proposal);
      await this.locationVoteService.handleDizApproval(proposal, vote, location, proposalUrl);
    }
  }

  async handleProposalUacApproval(proposal: Proposal, vote: boolean, location: MiiLocation) {
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
      await this.reportsService.handleReportCreate(proposal, report, proposalUrl);
    }
  }

  async handleProposalReportUpdate(proposal: Proposal, report: ReportDto) {
    if (proposal && report) {
      const proposalUrl = this.getProposalUrl(proposal);
      await this.reportsService.handleReportUpdate(proposal, report, proposalUrl);
    }
  }

  async handleProposalReportDelete(proposal: Proposal, report: ReportDto) {
    if (proposal && report) {
      const proposalUrl = this.getProposalUrl(proposal);
      await this.reportsService.handleReportDelete(proposal, report, proposalUrl);
    }
  }

  async handleProposalPublicationCreate(proposal: Proposal, publication: PublicationCreateDto) {
    if (proposal && publication) {
      const proposalUrl = this.getProposalUrl(proposal);
      await this.publicationsService.handlePublicationCreate(proposal, publication, proposalUrl);
    }
  }

  async handleProposalPublicationUpdate(proposal: Proposal, publication: PublicationUpdateDto) {
    if (proposal && publication) {
      const proposalUrl = this.getProposalUrl(proposal);
      await this.publicationsService.handlePublicationUpdate(proposal, publication, proposalUrl);
    }
  }

  async handleProposalPublicationDelete(proposal: Proposal, publication: Publication) {
    if (proposal && publication) {
      const proposalUrl = this.getProposalUrl(proposal);
      await this.publicationsService.handlePublicationDelete(proposal, publication, proposalUrl);
    }
  }
}
