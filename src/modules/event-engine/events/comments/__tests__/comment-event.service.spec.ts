import { Test, TestingModule } from '@nestjs/testing';
import { KeycloakUtilService } from 'src/modules/user/keycloak-util.service';
import { CommentEventService } from '../comment-event.service';
import { EmailService } from 'src/modules/email/email.service';
import { ConfigService } from '@nestjs/config';
import { Proposal } from 'src/modules/proposal/schema/proposal.schema';
import { Role } from 'src/shared/enums/role.enum';
import { MiiLocation } from 'src/shared/constants/mii-locations';
import { CommentType } from 'src/modules/comment/enums/comment-type.enum';
import { Comment } from 'src/modules/comment/schema/comment.schema';
import { IRequestUser } from 'src/shared/types/request-user.interface';

import {
  getProposalTaskCreationEmailForFdpg,
  getProposalTaskCreationEmailForOwner,
} from '../proposal-task-creation.emails';
import {
  getProposalMessageCreationEmailForDiz,
  getProposalMessageCreationEmailForFdpg,
  getProposalMessageCreationEmailForOwner,
} from '../proposal-message-creation.emails';
import { getProposalTaskCompletionEmailForFdpg } from '../proposal-task-completion.emails';

jest.mock('../proposal-message-creation.emails', () => ({
  getProposalMessageCreationEmailForDiz: jest
    .fn()
    .mockReturnValue({ content: 'getProposalMessageCreationEmailForDiz' }),
  getProposalMessageCreationEmailForFdpg: jest
    .fn()
    .mockReturnValue({ content: 'getProposalMessageCreationEmailForFdpg' }),
  getProposalMessageCreationEmailForOwner: jest
    .fn()
    .mockReturnValue({ content: 'getProposalMessageCreationEmailForOwner' }),
  getProposalMessageCreationEmailForUac: jest
    .fn()
    .mockReturnValue({ content: 'getProposalMessageCreationEmailForUac' }),
}));

jest.mock('../proposal-task-completion.emails', () => ({
  getProposalTaskCompletionEmailForDiz: jest.fn().mockReturnValue({ content: 'getProposalTaskCompletionEmailForDiz' }),
  getProposalTaskCompletionEmailForFdpg: jest
    .fn()
    .mockReturnValue({ content: 'getProposalTaskCompletionEmailForFdpg' }),
  getProposalTaskCompletionEmailForUac: jest.fn().mockReturnValue({ content: 'getProposalTaskCompletionEmailForUac' }),
}));

jest.mock('../proposal-task-creation.emails', () => ({
  getProposalTaskCreationEmailForFdpg: jest.fn().mockReturnValue({ content: 'getProposalTaskCreationEmailForFdpg' }),
  getProposalTaskCreationEmailForOwner: jest.fn().mockReturnValue({ content: 'getProposalTaskCreationEmailForOwner' }),
}));

describe('CommentEventService', () => {
  let commentEventService: CommentEventService;
  let keycloakUtilService: KeycloakUtilService;
  let emailService: EmailService;
  let configService: ConfigService;

  const proposal = {
    _id: 'proposalId',
    owner: {
      id: 'ownerId',
    },
    dizApprovedLocations: [MiiLocation.UKL],
  } as any as Proposal;

  const proposalUrl = 'proposalUrl';

  const comment = {
    _id: 'commentId',
    type: CommentType.ProposalTask,
    locations: [],
    owner: {
      id: 'ownerId',
      role: Role.FdpgMember,
      miiLocation: MiiLocation.UKL,
    },
  } as any as Comment;

  const validOwnerContacts = [{ email: 'unit@test.de', id: 'ownerId' }];
  const dizMembers = [
    { email: 'diz1@test.de', id: 'diz1', miiLocation: MiiLocation.UKL, singleKnownRole: Role.DizMember },
    { email: 'diz2@test.de', id: 'diz2', miiLocation: MiiLocation.UMG, singleKnownRole: Role.DizMember },
  ];
  const uacMembers = [
    { email: 'uac1@test.de', id: 'uac1', miiLocation: MiiLocation.UKL, singleKnownRole: Role.UacMember },
    { email: 'uac2@test.de', id: 'uac2', miiLocation: MiiLocation.UMG, singleKnownRole: Role.UacMember },
  ];
  const fdpgMembers = [
    { email: 'fdpg1@test.de', id: 'fdpg1' },
    { email: 'fdpg2@test.de', id: 'fdpg2' },
  ];
  const locationContacts = [
    { email: 'diz1@test.de', id: 'diz1', miiLocation: MiiLocation.UKL, singleKnownRole: Role.DizMember },
    { email: 'uac1@test.de', id: 'uac1', miiLocation: MiiLocation.UKL, singleKnownRole: Role.UacMember },
  ];

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentEventService,
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

    commentEventService = module.get<CommentEventService>(CommentEventService);
    keycloakUtilService = module.get<KeycloakUtilService>(KeycloakUtilService) as jest.Mocked<KeycloakUtilService>;
    emailService = module.get<EmailService>(EmailService) as jest.Mocked<EmailService>;
    configService = module.get<ConfigService>(ConfigService) as jest.Mocked<ConfigService>;
  });

  describe('constructor', () => {
    it('should get config values', () => {
      expect(configService.get).toHaveBeenCalledWith('EMAIL_SERVICE_PREVENT_TASK_COMPLETED_BY_FDPG');
      expect(configService.get).toHaveBeenCalledWith('EMAIL_SERVICE_PREVENT_TASK_COMPLETED_BY_OWNER');
      expect(configService.get).toHaveBeenCalledWith('EMAIL_SERVICE_PREVENT_TASK_CREATION_FOR_OWNER');
      expect(configService.get).toHaveBeenCalledWith('EMAIL_SERVICE_PREVENT_TASK_CREATION_FOR_FDPG');
      expect(configService.get).toHaveBeenCalledWith('EMAIL_SERVICE_PREVENT_MESSAGE_TO_LOCATION_CREATION');
      expect(configService.get).toHaveBeenCalledWith('EMAIL_SERVICE_PREVENT_MESSAGE_TO_FDPG_CREATION');
      expect(configService.get).toHaveBeenCalledWith('EMAIL_SERVICE_PREVENT_MESSAGE_TO_OWNER_CREATION');
    });
  });

  describe('handleCommentCreation', () => {
    describe(`handle for ${CommentType.ProposalTask}`, () => {
      test.each([true, false])('should send email for task creation (prevent: %s)', async (prevent: boolean) => {
        commentEventService['PREVENT_TASK_CREATION_FOR_OWNER'] = prevent;
        comment.type = CommentType.ProposalTask;
        const user = {
          role: Role.Researcher,
        } as any as IRequestUser;

        await commentEventService.handleCommentCreation(proposal, comment, user, proposalUrl);

        if (prevent) {
          expect(emailService.send).not.toHaveBeenCalled();
        } else {
          expect(keycloakUtilService.getValidContactsByUserIds).toHaveBeenCalledWith([proposal.owner.id]);
          expect(getProposalTaskCreationEmailForOwner).toHaveBeenCalledWith(
            validOwnerContacts,
            proposal,
            comment,
            proposalUrl,
          );
          expect(emailService.send).toHaveBeenCalledWith({ content: 'getProposalTaskCreationEmailForOwner' });
        }
      });
    });

    describe(`handle for ${CommentType.ProposalTaskFdpg}`, () => {
      test.each([true, false])('should send email for fdpg task creation (prevent: %s)', async (prevent: boolean) => {
        comment.type = CommentType.ProposalTaskFdpg;
        commentEventService['PREVENT_TASK_CREATION_FOR_FDPG'] = prevent;

        const user = {
          role: Role.FdpgMember,
        } as any as IRequestUser;

        await commentEventService.handleCommentCreation(proposal, comment, user, proposalUrl);

        if (prevent) {
          expect(emailService.send).not.toHaveBeenCalled();
        } else {
          expect(keycloakUtilService.getFdpgMemberLevelContacts).toHaveBeenCalledWith(proposal);
          expect(keycloakUtilService.getFdpgMemberLevelContacts).toHaveBeenCalledTimes(1);
          const fdpgMemberEmails = fdpgMembers.map((member) => member.email);
          expect(getProposalTaskCreationEmailForFdpg).toHaveBeenCalledWith(
            fdpgMemberEmails,
            proposal,
            comment,
            proposalUrl,
          );
          expect(emailService.send).toHaveBeenCalledWith({ content: 'getProposalTaskCreationEmailForFdpg' });
        }
      });
    });

    describe(`handle for ${CommentType.ProposalMessageToLocation} from FDPG Member`, () => {
      test.each([true, false])(
        'should send email for message to location creation (prevent: %s)',
        async (prevent: boolean) => {
          comment.type = CommentType.ProposalMessageToLocation;
          comment.locations = [MiiLocation.UKL];
          commentEventService['PREVENT_MESSAGE_TO_LOCATION_CREATION'] = prevent;

          const user = {
            singleKnownRole: Role.FdpgMember,
          } as any as IRequestUser;

          await commentEventService.handleCommentCreation(proposal, comment, user, proposalUrl);

          if (prevent) {
            expect(emailService.send).not.toHaveBeenCalled();
          } else {
            expect(keycloakUtilService.getLocationContacts).toHaveBeenCalledWith(comment.locations, dizMembers);
            expect(keycloakUtilService.getLocationContacts).toHaveBeenCalledWith(comment.locations, uacMembers);

            expect(getProposalMessageCreationEmailForDiz).toHaveBeenCalledWith(
              locationContacts,
              proposal,
              comment,
              proposalUrl,
            );
            expect(emailService.send).toHaveBeenCalledWith({ content: 'getProposalMessageCreationEmailForDiz' });
          }
        },
      );
    });

    describe(`handle for ${CommentType.ProposalMessageToLocation} from DIZ Member`, () => {
      test.each([true, false])(
        'should send email for message to location creation (prevent: %s)',
        async (prevent: boolean) => {
          comment.type = CommentType.ProposalMessageToLocation;
          comment.locations = [MiiLocation.UKL];
          commentEventService['PREVENT_MESSAGE_TO_FDPG_CREATION'] = prevent;

          const user = {
            singleKnownRole: Role.DizMember,
          } as any as IRequestUser;

          await commentEventService.handleCommentCreation(proposal, comment, user, proposalUrl);

          if (prevent) {
            expect(emailService.send).not.toHaveBeenCalled();
          } else {
            const fdpgEmails = fdpgMembers.map((member) => member.email);
            expect(keycloakUtilService.getFdpgMemberLevelContacts).toHaveBeenCalledWith(proposal);
            expect(keycloakUtilService.getFdpgMemberLevelContacts).toHaveBeenCalledTimes(1);
            expect(getProposalMessageCreationEmailForFdpg).toHaveBeenCalledWith(
              fdpgEmails,
              proposal,
              comment,
              proposalUrl,
            );
            expect(emailService.send).toHaveBeenCalledWith({ content: 'getProposalMessageCreationEmailForFdpg' });
          }
        },
      );
    });

    describe(`handle for ${CommentType.ProposalMessageToOwner} from FDPG Member`, () => {
      test.each([true, false])(
        'should send email for message to owner creation (prevent: %s)',
        async (prevent: boolean) => {
          comment.type = CommentType.ProposalMessageToOwner;
          commentEventService['PREVENT_MESSAGE_TO_OWNER_CREATION'] = prevent;

          const user = {
            singleKnownRole: Role.FdpgMember,
          } as any as IRequestUser;

          await commentEventService.handleCommentCreation(proposal, comment, user, proposalUrl);

          if (prevent) {
            expect(emailService.send).not.toHaveBeenCalled();
          } else {
            expect(keycloakUtilService.getValidContactsByUserIds).toHaveBeenCalledWith([proposal.owner.id]);
            expect(getProposalMessageCreationEmailForOwner).toHaveBeenCalledWith(
              validOwnerContacts,
              proposal,
              comment,
              proposalUrl,
            );
            expect(emailService.send).toHaveBeenCalledWith({ content: 'getProposalMessageCreationEmailForOwner' });
          }
        },
      );

      test.each([true, false])(
        'should send email for message to owner creation (prevent: %s) for Researcher',
        async (prevent: boolean) => {
          comment.type = CommentType.ProposalMessageToOwner;
          commentEventService['PREVENT_MESSAGE_TO_FDPG_CREATION'] = prevent;

          const user = {
            role: Role.Researcher,
          } as any as IRequestUser;

          await commentEventService.handleCommentCreation(proposal, comment, user, proposalUrl);

          if (prevent) {
            expect(emailService.send).not.toHaveBeenCalled();
          } else {
            const fdpgEmails = fdpgMembers.map((member) => member.email);
            expect(keycloakUtilService.getFdpgMemberLevelContacts).toHaveBeenCalledWith(proposal);
            expect(keycloakUtilService.getFdpgMemberLevelContacts).toHaveBeenCalledTimes(1);
            expect(getProposalMessageCreationEmailForFdpg).toHaveBeenCalledWith(
              fdpgEmails,
              proposal,
              comment,
              proposalUrl,
            );
            expect(emailService.send).toHaveBeenCalledWith({ content: 'getProposalMessageCreationEmailForFdpg' });
          }
        },
      );
    });
  });

  describe('handleTaskCompletion', () => {
    describe('handle for ProposalTask', () => {
      test.each([true, false])('should send email for task completion (prevent: %s)', async (prevent: boolean) => {
        comment.type = CommentType.ProposalTask;
        commentEventService['PREVENT_TASK_COMPLETED_BY_OWNER'] = prevent;

        const user = {
          role: Role.Researcher,
        } as any as IRequestUser;

        await commentEventService.handleTaskCompletion(proposal, comment, user, proposalUrl);

        if (prevent) {
          expect(emailService.send).not.toHaveBeenCalled();
        } else {
          const fdpgEmails = fdpgMembers.map((member) => member.email);
          expect(keycloakUtilService.getFdpgMemberLevelContacts).toHaveBeenCalledWith(proposal);
          expect(keycloakUtilService.getFdpgMemberLevelContacts).toHaveBeenCalledTimes(1);
          expect(getProposalTaskCompletionEmailForFdpg).toHaveBeenCalledWith(
            fdpgEmails,
            proposal,
            comment,
            proposalUrl,
          );
          expect(emailService.send).toHaveBeenCalledWith({ content: 'getProposalTaskCompletionEmailForFdpg' });
        }
      });
    });

    describe('handle for ProposalTaskFdpg', () => {
      test.each([true, false])('should send email for diz task completion (prevent: %s)', async (prevent: boolean) => {
        comment.type = CommentType.ProposalTaskFdpg;
        commentEventService['PREVENT_TASK_COMPLETED_BY_FDPG'] = prevent;

        const user = {
          singleKnownRole: Role.FdpgMember,
        } as any as IRequestUser;

        comment.owner.role = Role.DizMember;
        comment.owner.miiLocation = MiiLocation.UKL;

        await commentEventService.handleTaskCompletion(proposal, comment, user, proposalUrl);

        if (prevent) {
          expect(emailService.send).not.toHaveBeenCalled();
        } else {
          expect(keycloakUtilService.getDizMembers).toHaveBeenCalledTimes(1);
          expect(keycloakUtilService.getLocationContacts).toHaveBeenCalledWith([MiiLocation.UKL], dizMembers);
          expect(emailService.send).toHaveBeenCalledWith({ content: 'getProposalTaskCompletionEmailForDiz' });
        }
      });

      test.each([true, false])('should send email for uac task completion (prevent: %s)', async (prevent: boolean) => {
        comment.type = CommentType.ProposalTaskFdpg;
        commentEventService['PREVENT_TASK_COMPLETED_BY_FDPG'] = prevent;

        const user = {
          singleKnownRole: Role.FdpgMember,
        } as any as IRequestUser;

        comment.owner.role = Role.UacMember;
        comment.owner.miiLocation = MiiLocation.UKL;

        await commentEventService.handleTaskCompletion(proposal, comment, user, proposalUrl);

        if (prevent) {
          expect(emailService.send).not.toHaveBeenCalled();
        } else {
          expect(keycloakUtilService.getUacMembers).toHaveBeenCalledTimes(1);
          expect(keycloakUtilService.getLocationContacts).toHaveBeenCalledWith([MiiLocation.UKL], uacMembers);
          expect(emailService.send).toHaveBeenCalledWith({ content: 'getProposalTaskCompletionEmailForUac' });
        }
      });
    });
  });
});
