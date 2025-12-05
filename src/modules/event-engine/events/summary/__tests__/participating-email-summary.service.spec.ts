import { KeycloakUtilService } from 'src/modules/user/keycloak-util.service';
import { EmailService } from 'src/modules/email/email.service';
import { Test, TestingModule } from '@nestjs/testing';
import { Proposal } from 'src/modules/proposal/schema/proposal.schema';
import { Role } from 'src/shared/enums/role.enum';
import { ParticipantEmailSummaryService } from '../participant-email-summary.service';
import { HistoryEventType } from 'src/modules/proposal/enums/history-event.enum';
import { HistoryEvent } from 'src/modules/proposal/schema/sub-schema/history-event.schema';
import { Participant } from 'src/modules/proposal/schema/sub-schema/participant.schema';
import { Researcher } from 'src/modules/proposal/schema/sub-schema/participants/researcher.schema';
import { ProjectResponsible } from 'src/modules/proposal/schema/sub-schema/project-responsible.schema';

describe('ParticipantEmailSummaryService', () => {
  let participantEmailSummaryService: ParticipantEmailSummaryService;
  let keycloakUtilService: KeycloakUtilService;
  let emailService: EmailService;

  const proposal = {
    _id: 'proposalId',
    projectAbbreviation: 'abb',
    owner: {
      id: 'ownerId',
    },
    uacApprovedLocations: ['UKL'],
    openDizChecks: ['CTK'],
    dizApprovedLocations: ['BHC'],
    requestedButExcludedLocations: [],
  } as any as Proposal;

  const proposalUrl = 'proposalUrl';

  const mockLocation = 'UKL';

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
        ParticipantEmailSummaryService,
        {
          provide: KeycloakUtilService,
          useValue: {
            getValidContactsByUserIds: jest.fn().mockResolvedValue(validOwnerContacts),
            getFdpgMemberLevelContacts: jest.fn().mockResolvedValue(fdpgMembers),
            getDizMembers: jest.fn().mockResolvedValue(dizMembers),
            getUacMembers: jest.fn().mockResolvedValue(uacMembers),
            getLocationContacts: jest.fn().mockResolvedValue(locationContacts),
            getValidContacts: jest.fn().mockResolvedValue(validOwnerContacts),
          },
        },
        {
          provide: EmailService,
          useValue: {
            send: jest.fn(),
          },
        },
      ],
      imports: [],
    }).compile();

    participantEmailSummaryService = module.get<ParticipantEmailSummaryService>(ParticipantEmailSummaryService);
    keycloakUtilService = module.get<KeycloakUtilService>(KeycloakUtilService) as jest.Mocked<KeycloakUtilService>;
    emailService = module.get<EmailService>(EmailService) as jest.Mocked<EmailService>;
  });

  describe('it should send mails', () => {
    it('should take history changes into account', async () => {
      const proposaloverr = {
        ...proposal,
        projectResponsible: {
          researcher: { email: 'email', firstName: 'first', lastName: 'lastname' } as any as Researcher,
        } as ProjectResponsible,
        participants: [
          { researcher: { email: 'email', firstName: 'first', lastName: 'lastname' } } as any as Participant,
        ],
        history: [
          { type: HistoryEventType.ProposalRejected, createdAt: new Date('13 May, 1997 09:00:00') } as HistoryEvent,
          { type: HistoryEventType.ProposalFdpgCheck, createdAt: new Date('13 May, 1997 09:30:00') } as HistoryEvent,
        ],
      };

      await participantEmailSummaryService.handleParticipatingScientistSummary(
        proposaloverr,
        proposalUrl,
        new Date('13 May, 1997 08:00:00'),
      );

      expect(emailService.send).toHaveBeenCalled();
    });
  });
});
