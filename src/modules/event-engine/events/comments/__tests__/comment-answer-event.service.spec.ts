import { Test, TestingModule } from '@nestjs/testing';
import { KeycloakUtilService } from 'src/modules/user/keycloak-util.service';
import { EmailService } from 'src/modules/email/email.service';
import { ConfigService } from '@nestjs/config';
import { Proposal } from 'src/modules/proposal/schema/proposal.schema';
import { Role } from 'src/shared/enums/role.enum';
import { CommentType } from 'src/modules/comment/enums/comment-type.enum';
import { Comment } from 'src/modules/comment/schema/comment.schema';
import { IRequestUser } from 'src/shared/types/request-user.interface';

import {
  getProposalMessageAnswerCreationEmailForDiz,
  getProposalMessageAnswerCreationEmailForFdpg,
  getProposalMessageAnswerCreationEmailForOwner,
  getProposalMessageAnswerCreationEmailForUac,
} from '../proposal-message-answer-creation.emails';
import { CommentAnswerEventService } from '../comment-answer-event.service';
import { Answer } from 'src/modules/comment/schema/answer.schema';

jest.mock('../proposal-message-answer-creation.emails', () => ({
  getProposalMessageAnswerCreationEmailForDiz: jest
    .fn()
    .mockReturnValue({ content: 'getProposalMessageAnswerCreationEmailForDiz' }),
  getProposalMessageAnswerCreationEmailForFdpg: jest
    .fn()
    .mockReturnValue({ content: 'getProposalMessageAnswerCreationEmailForFdpg' }),
  getProposalMessageAnswerCreationEmailForOwner: jest
    .fn()
    .mockReturnValue({ content: 'getProposalMessageAnswerCreationEmailForOwner' }),
  getProposalMessageAnswerCreationEmailForUac: jest
    .fn()
    .mockReturnValue({ content: 'getProposalMessageAnswerCreationEmailForUac' }),
}));

describe('CommentAnswerEventService', () => {
  let commentAnswerEventService: CommentAnswerEventService;
  let keycloakUtilService: KeycloakUtilService;
  let emailService: EmailService;
  let configService: ConfigService;

  const proposal = {
    _id: 'proposalId',
    owner: {
      id: 'ownerId',
    },
    dizApprovedLocations: ['UKL'],
  } as any as Proposal;

  const proposalUrl = 'proposalUrl';

  const comment = {
    _id: 'commentId',
    type: CommentType.ProposalTask,
    locations: [],
    owner: {
      id: 'ownerId',
      role: Role.FdpgMember,
      miiLocation: 'UKL',
    },
  } as any as Comment;

  const answer = {
    _id: 'answerId',
    content: 'content',
    isDone: false,
    fdpgTaskId: 'taskId',
    locations: ['UKL', 'KUM'],
    versionOfItem: 1,
    owner: {
      id: 'ownerId',
      role: Role.FdpgMember,
      miiLocation: 'UKL',
    },
  } as any as Answer;

  const validOwnerContacts = [{ email: 'unit@test.de', id: 'ownerId' }];
  const dizMembers = [
    { email: 'diz1@test.de', id: 'diz1', miiLocation: 'UKL', singleKnownRole: Role.DizMember },
    { email: 'diz2@test.de', id: 'diz2', miiLocation: 'UMG', singleKnownRole: Role.DizMember },
  ];
  const uacMembers = [
    { email: 'uac1@test.de', id: 'uac1', miiLocation: 'UKL', singleKnownRole: Role.UacMember },
    { email: 'uac2@test.de', id: 'uac2', miiLocation: 'UMG', singleKnownRole: Role.UacMember },
  ];
  const fdpgMembers = [
    { email: 'fdpg1@test.de', id: 'fdpg1' },
    { email: 'fdpg2@test.de', id: 'fdpg2' },
  ];
  const locationContacts = [
    { email: 'diz1@test.de', id: 'diz1', miiLocation: 'UKL', singleKnownRole: Role.DizMember },
    { email: 'uac1@test.de', id: 'uac1', miiLocation: 'UKL', singleKnownRole: Role.UacMember },
  ];

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentAnswerEventService,
        {
          provide: KeycloakUtilService,
          useValue: {
            getValidContactsByUserIds: jest.fn().mockResolvedValue(validOwnerContacts),
            getFdpgMemberLevelContacts: jest.fn().mockResolvedValue(fdpgMembers),
            getDizMembers: jest.fn().mockResolvedValue(dizMembers),
            getUacMembers: jest.fn().mockResolvedValue(uacMembers),
            getLocationContacts: jest.fn().mockResolvedValue(locationContacts),
          },
        },
        {
          provide: EmailService,
          useValue: {
            send: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => key),
          },
        },
      ],
      imports: [],
    }).compile();

    commentAnswerEventService = module.get<CommentAnswerEventService>(CommentAnswerEventService);
    keycloakUtilService = module.get<KeycloakUtilService>(KeycloakUtilService) as jest.Mocked<KeycloakUtilService>;
    emailService = module.get<EmailService>(EmailService) as jest.Mocked<EmailService>;
    configService = module.get<ConfigService>(ConfigService) as jest.Mocked<ConfigService>;
  });

  describe('constructor', () => {
    it('should get config values', () => {
      expect(configService.get).toHaveBeenCalledWith('EMAIL_SERVICE_PREVENT_MESSAGE_TO_LOCATION_ANSWER');
      expect(configService.get).toHaveBeenCalledWith('EMAIL_SERVICE_PREVENT_MESSAGE_TO_FDPG_ANSWER');
      expect(configService.get).toHaveBeenCalledWith('EMAIL_SERVICE_PREVENT_MESSAGE_TO_OWNER_ANSWER');
    });
  });

  describe('handle comment answer creation', () => {
    it('should answer to the location as fdpg role', async () => {
      const user = {
        singleKnownRole: Role.FdpgMember,
      } as any as IRequestUser;
      comment.type = CommentType.ProposalMessageToLocation;

      await commentAnswerEventService.handleCommentAnswerCreation(proposal, comment, answer, user, proposalUrl);

      expect(getProposalMessageAnswerCreationEmailForDiz).toHaveBeenCalled();
      expect(getProposalMessageAnswerCreationEmailForUac).toHaveBeenCalled();
    });

    it('should answer to the location as diz role', async () => {
      const user = {
        singleKnownRole: Role.DizMember,
      } as any as IRequestUser;
      comment.type = CommentType.ProposalMessageToLocation;

      await commentAnswerEventService.handleCommentAnswerCreation(proposal, comment, answer, user, proposalUrl);

      expect(getProposalMessageAnswerCreationEmailForFdpg).toHaveBeenCalled();
    });

    it('should answer to the owner as fdpg', async () => {
      const user = {
        singleKnownRole: Role.FdpgMember,
      } as any as IRequestUser;
      comment.type = CommentType.ProposalMessageToOwner;

      await commentAnswerEventService.handleCommentAnswerCreation(proposal, comment, answer, user, proposalUrl);

      expect(getProposalMessageAnswerCreationEmailForOwner).toHaveBeenCalled();
    });

    it('should answer to the owner as researcher', async () => {
      const user = {
        singleKnownRole: Role.Researcher,
      } as any as IRequestUser;
      comment.type = CommentType.ProposalMessageToOwner;

      await commentAnswerEventService.handleCommentAnswerCreation(proposal, comment, answer, user, proposalUrl);

      expect(getProposalMessageAnswerCreationEmailForFdpg).toHaveBeenCalled();
    });
  });
});
