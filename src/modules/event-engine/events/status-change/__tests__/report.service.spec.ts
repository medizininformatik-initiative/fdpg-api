import { KeycloakUtilService } from 'src/modules/user/keycloak-util.service';
import { EmailService } from 'src/modules/email/email.service';
import { Test, TestingModule } from '@nestjs/testing';
import { Proposal } from 'src/modules/proposal/schema/proposal.schema';
import { Role } from 'src/shared/enums/role.enum';
import { StatusChangeService } from '../status-change.service';
import { ProposalStatus } from 'src/modules/proposal/enums/proposal-status.enum';

describe('StatusChangeService', () => {
  let statusChangeService: StatusChangeService;
  let keycloakUtilService: KeycloakUtilService;
  let emailService: EmailService;

  const proposal = {
    _id: 'proposalId',
    projectAbbreviation: 'abb',
    owner: {
      id: 'ownerId',
    },
    uacApprovedLocations: ['UKL'],
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
        StatusChangeService,
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

    statusChangeService = module.get<StatusChangeService>(StatusChangeService);
    keycloakUtilService = module.get<KeycloakUtilService>(KeycloakUtilService) as jest.Mocked<KeycloakUtilService>;
    emailService = module.get<EmailService>(EmailService) as jest.Mocked<EmailService>;
  });

  describe('it should send mails', () => {
    test.each([
      ProposalStatus.FdpgCheck,
      ProposalStatus.Rework,
      ProposalStatus.Rejected,
      ProposalStatus.LocationCheck,
      ProposalStatus.Contracting,
    ])('for status `%s`', async (status: ProposalStatus) => {
      await statusChangeService.handleStatusChange({ ...proposal, status }, proposalUrl);
      expect(emailService.send).toHaveBeenCalled();
    });

    it('should not send a mail', async () => {
      await statusChangeService.handleStatusChange({ ...proposal, status: ProposalStatus.Draft }, proposalUrl);
      expect(emailService.send).toHaveBeenCalledTimes(0);
    });
  });
});
