import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { TestingModule, Test } from '@nestjs/testing';
import { Model } from 'mongoose';
import { ProposalDocument, Proposal } from '../proposal/schema/proposal.schema';
import { EventEngineService } from './event-engine.service';
import { CommentAnswerEventService } from './events/comments/comment-answer-event.service';
import { CommentEventService } from './events/comments/comment-event.service';
import { ContractingService } from './events/contracting/contracting.service';
import { LocationVoteService } from './events/location-vote/location-vote.service';
import { ProposalLockService } from './events/proposal-lock/proposal-lock.service';
import { PublicationsService } from './events/publications/publications.service';
import { ReportsService } from './events/reports/reports.service';
import { StatusChangeService } from './events/status-change/status-change.service';
import { StatusReminderService } from './events/status-reminder/status-reminder.service';
import { DeadlineEventService } from './events/deadlines/deadline-event.service';
import { ParticipantEmailSummaryService } from './events/summary/participant-email-summary.service';
import { DataDeliveryEventService } from './events/data-delivery/data-delivery-event.service';
import { Location } from '../location/schema/location.schema';

describe('EventEngineService', () => {
  let eventEngineService: EventEngineService;
  let proposalModel: Model<ProposalDocument>;
  let statusChangeService: StatusChangeService;
  let proposalLockService: ProposalLockService;
  let statusReminderService: StatusReminderService;
  let commentEventService: CommentEventService;
  let commentAnswerEventService: CommentAnswerEventService;
  let locationVoteService: LocationVoteService;
  let contractingService: ContractingService;
  let reportsService: ReportsService;
  let publicationsService: PublicationsService;
  let configService: ConfigService;
  let dataDeliveryEventService: DataDeliveryEventService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventEngineService,
        {
          provide: getModelToken(Proposal.name),
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: StatusChangeService,
          useValue: {
            handleStatusChange: jest.fn(),
          },
        },
        {
          provide: ProposalLockService,
          useValue: {
            handleProposalLockChange: jest.fn(),
          },
        },
        {
          provide: StatusReminderService,
          useValue: {
            handleStatusReminder: jest.fn(),
          },
        },
        {
          provide: CommentEventService,
          useValue: {
            handleCommentCreation: jest.fn(),
            handleTaskCompletion: jest.fn(),
          },
        },
        {
          provide: CommentAnswerEventService,
          useValue: {
            handleCommentAnswerCreation: jest.fn(),
          },
        },
        {
          provide: LocationVoteService,
          useValue: {
            handleDizApproval: jest.fn(),
            handleUacApproval: jest.fn(),
          },
        },
        {
          provide: ContractingService,
          useValue: {
            handleContractSign: jest.fn(),
          },
        },
        {
          provide: ReportsService,
          useValue: {
            handleReportCreate: jest.fn(),
          },
        },
        {
          provide: PublicationsService,
          useValue: {
            handlePublicationCreate: jest.fn(),
            handlePublicationUpdate: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => key),
          },
        },
        {
          provide: DeadlineEventService,
          useValue: {
            sendForDeadlineChange: jest.fn(),
          },
        },
        {
          provide: ParticipantEmailSummaryService,
          useValue: {
            handleParticipatingScientistSummary: jest.fn(),
          },
        },
        {
          provide: DataDeliveryEventService,
          useValue: {
            handleDataDeliveryInitiated: jest.fn(),
            handleDataDeliveryDataReady: jest.fn(),
            handleDataDeliveryDataReturn: jest.fn(),
          },
        },
      ],
    }).compile();

    eventEngineService = module.get<EventEngineService>(EventEngineService);
    proposalModel = module.get<Model<ProposalDocument>>(getModelToken(Proposal.name));
    statusChangeService = module.get<StatusChangeService>(StatusChangeService);
    proposalLockService = module.get<ProposalLockService>(ProposalLockService);
    statusReminderService = module.get<StatusReminderService>(StatusReminderService);
    commentEventService = module.get<CommentEventService>(CommentEventService);
    commentAnswerEventService = module.get<CommentAnswerEventService>(CommentAnswerEventService);
    locationVoteService = module.get<LocationVoteService>(LocationVoteService);
    contractingService = module.get<ContractingService>(ContractingService);
    reportsService = module.get<ReportsService>(ReportsService);
    publicationsService = module.get<PublicationsService>(PublicationsService);
    configService = module.get<ConfigService>(ConfigService);
    dataDeliveryEventService = module.get<DataDeliveryEventService>(DataDeliveryEventService);
  });

  const proposal = {
    _id: 'proposalId',
    status: 'status',
    statusChangeDate: new Date(),
  };

  const locations = [{ _id: 'loc1' } as Location, { _id: 'loc2' } as Location];

  const expectedUrl = `PORTAL_HOST/proposals/${proposal._id}/details`;

  it('should handleProposalStatusChange', async () => {
    await eventEngineService.handleProposalStatusChange(proposal as any);
    expect(statusChangeService.handleStatusChange).toHaveBeenCalledWith(proposal, expectedUrl);
  });

  it('should handleProposalLockChange', async () => {
    await eventEngineService.handleProposalLockChange(proposal as any);
    expect(proposalLockService.handleProposalLockChange).toHaveBeenCalledWith(proposal, expectedUrl);
  });

  it('should handleProposalStatusSchedule', async () => {
    const saveMock = jest.fn();
    jest.spyOn(proposalModel, 'findById').mockResolvedValueOnce({
      ...proposal,
      save: saveMock,
      scheduledEvents: [
        {
          scheduleId: 'scheduleId',
        },
        {
          scheduleId: 'scheduleId2',
        },
      ],
    });

    const event = {
      referenceDocumentId: 'proposalId',
      _id: {
        toString: () => 'scheduleId',
      },
    } as any;

    await eventEngineService.handleProposalStatusSchedule(event);

    expect(statusReminderService.handleStatusReminder).toHaveBeenCalledWith(
      expect.objectContaining({ _id: 'proposalId' }),
      expectedUrl,
      event,
    );
  });

  it('should handleProposalDizApproval', async () => {
    const vote = true;
    const location = 'UKL';
    await eventEngineService.handleProposalDizApproval(proposal as any, vote, location);
    expect(locationVoteService.handleDizApproval).toHaveBeenCalledWith(proposal, vote, location, expectedUrl);
  });

  it('should handleProposalUacApproval', async () => {
    const vote = true;
    const location = 'UKL';
    await eventEngineService.handleProposalUacApproval(proposal as any, vote, location);
    expect(locationVoteService.handleUacApproval).toHaveBeenCalledWith(proposal, vote, location, expectedUrl);
  });

  it('should handleProposalContractSign', async () => {
    const vote = true;
    const user = { name: 'Test' } as any;
    await eventEngineService.handleProposalContractSign(proposal as any, vote, user);
    expect(contractingService.handleContractSign).toHaveBeenCalledWith(proposal, vote, user, expectedUrl);
  });

  it('should handleProposalCommentCreation', async () => {
    const user = { name: 'Test' } as any;
    const comment = { content: 'comment' } as any;
    await eventEngineService.handleProposalCommentCreation(proposal as any, comment, user);
    expect(commentEventService.handleCommentCreation).toHaveBeenCalledWith(proposal, comment, user, expectedUrl);
  });

  it('should handleProposalCommentAnswerCreation', async () => {
    const user = { name: 'Test' } as any;
    const comment = { content: 'comment' } as any;
    const answer = { content: 'answer' } as any;
    await eventEngineService.handleProposalCommentAnswerCreation(proposal as any, comment, answer, user);
    expect(commentAnswerEventService.handleCommentAnswerCreation).toHaveBeenCalledWith(
      proposal,
      comment,
      answer,
      user,
      expectedUrl,
    );
  });

  it('should handleProposalTaskCompletion', async () => {
    const user = { name: 'Test' } as any;
    const comment = { content: 'comment' } as any;
    await eventEngineService.handleProposalTaskCompletion(proposal as any, comment, user);
    expect(commentEventService.handleTaskCompletion).toHaveBeenCalledWith(proposal, comment, user, expectedUrl);
  });

  it('should handleProposalReportCreate', async () => {
    const report = { content: 'report' } as any;
    await eventEngineService.handleProposalReportCreate(proposal as any, report);
    expect(reportsService.handleReportCreate).toHaveBeenCalledWith(proposal, report, expectedUrl);
  });

  it('should handleProposalPublicationCreate', async () => {
    const publication = { content: 'publication' } as any;
    await eventEngineService.handleProposalPublicationCreate(proposal as any, publication);
    expect(publicationsService.handlePublicationCreate).toHaveBeenCalledWith(proposal, publication, expectedUrl);
  });

  it('should handleProposalPublicationUpdate', async () => {
    const publication = { content: 'publication' } as any;
    await eventEngineService.handleProposalPublicationUpdate(proposal as any, publication);
    expect(publicationsService.handlePublicationUpdate).toHaveBeenCalledWith(proposal, publication, expectedUrl);
  });

  it('should call handleDataDeliveryInitiated with the correct arguments', async () => {
    await eventEngineService.handleDataDeliveryInitiated(proposal as any, locations);

    expect(dataDeliveryEventService.handleDataDeliveryInitiated).toHaveBeenCalledWith(proposal, expectedUrl, locations);
  });

  it('should call handleDataDeliveryDataReady with the correct arguments', async () => {
    await eventEngineService.handleDataDeliveryDataReady(proposal as any, locations);

    expect(dataDeliveryEventService.handleDataDeliveryDataReady).toHaveBeenCalledWith(proposal, expectedUrl, locations);
  });

  it('should call handleDataDeliveryDataReturn with the correct arguments', async () => {
    await eventEngineService.handleDataDeliveryDataReturn(proposal as any);

    expect(dataDeliveryEventService.handleDataDeliveryDataReturn).toHaveBeenCalledWith(proposal, expectedUrl);
  });
});
