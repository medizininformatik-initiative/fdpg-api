import { KeycloakUtilService } from 'src/modules/user/keycloak-util.service';
import { DeadlineEventService } from '../deadline-event.service';
import { EmailService } from 'src/modules/email/email.service';
import { MiiLocation } from 'src/shared/constants/mii-locations';
import { Test, TestingModule } from '@nestjs/testing';
import { ProposalDocument } from 'src/modules/proposal/schema/proposal.schema';
import { Role } from 'src/shared/enums/role.enum';
import { DueDateEnum } from 'src/modules/proposal/enums/due-date.enum';

describe('DeadlineEventService', () => {
  let deadlineEventService: DeadlineEventService;
  let keycloakUtilService: KeycloakUtilService;
  let emailService: EmailService;

  const proposal = {
    _id: 'proposalId',
    owner: {
      id: 'ownerId',
    },
    openDizChecks: [],
    dizApprovedLocations: [MiiLocation.UKL],
    openDizConditionChecks: [],
    uacApprovedLocations: [],
    save: jest.fn(),
  } as any as ProposalDocument;

  const proposalUrl = 'proposalUrl';

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
        DeadlineEventService,
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
      ],
      imports: [],
    }).compile();

    deadlineEventService = module.get<DeadlineEventService>(DeadlineEventService);
    keycloakUtilService = module.get<KeycloakUtilService>(KeycloakUtilService) as jest.Mocked<KeycloakUtilService>;
    emailService = module.get<EmailService>(EmailService) as jest.Mocked<EmailService>;
  });

  it('it should notify on deadline changes', async () => {
    await deadlineEventService.sendForDeadlineChange(
      proposal,
      {
        [DueDateEnum.DUE_DAYS_LOCATION_CHECK]: new Date('July 17, 1997 08:00:00'),
        [DueDateEnum.DUE_DAYS_FDPG_CHECK]: new Date('July 17, 1997 08:00:00'),
        [DueDateEnum.DUE_DAYS_LOCATION_CONTRACTING]: new Date('July 17, 1997 08:00:00'),
        [DueDateEnum.DUE_DAYS_EXPECT_DATA_DELIVERY]: new Date('July 17, 1997 08:00:00'),
        [DueDateEnum.DUE_DAYS_DATA_CORRUPT]: new Date('July 17, 1997 08:00:00'),
        [DueDateEnum.DUE_DAYS_FINISHED_PROJECT]: new Date('July 17, 1997 08:00:00'),
      } as any as Record<DueDateEnum, Date>,
      proposalUrl,
    );

    expect(emailService.send).toHaveBeenCalled();
    expect(proposal.save).toHaveBeenCalled();
  });

  it('it should notify on deadline changes', async () => {
    await deadlineEventService.sendForDeadlineChange(
      proposal,
      {
        [DueDateEnum.DUE_DAYS_LOCATION_CHECK]: null,
        [DueDateEnum.DUE_DAYS_FDPG_CHECK]: null,
        [DueDateEnum.DUE_DAYS_LOCATION_CONTRACTING]: null,
        [DueDateEnum.DUE_DAYS_EXPECT_DATA_DELIVERY]: null,
        [DueDateEnum.DUE_DAYS_DATA_CORRUPT]: null,
        [DueDateEnum.DUE_DAYS_FINISHED_PROJECT]: null,
      } as any as Record<DueDateEnum, Date>,
      proposalUrl,
    );

    expect(emailService.send).toHaveBeenCalled();
    expect(proposal.save).toHaveBeenCalled();
  });

  it('it should not notify on deadline changes', async () => {
    await deadlineEventService.sendForDeadlineChange(proposal, {} as any as Record<DueDateEnum, Date>, proposalUrl);

    expect(emailService.send).toHaveBeenCalledTimes(0);
    expect(proposal.save).toHaveBeenCalledTimes(0);
  });
});
