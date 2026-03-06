import { KeycloakUtilService } from 'src/modules/user/keycloak-util.service';
import { EmailService } from 'src/modules/email/email.service';
import { Test, TestingModule } from '@nestjs/testing';
import { Proposal } from 'src/modules/proposal/schema/proposal.schema';
import { Role } from 'src/shared/enums/role.enum';
import { LocationVoteService } from '../location-vote.service';
import { defaultDueDateValues } from 'src/modules/proposal/enums/due-date.enum';

describe('LocationVoteService', () => {
  let locationVoteService: LocationVoteService;
  let keycloakUtilService: KeycloakUtilService;
  let emailService: EmailService;

  const proposal = {
    _id: 'proposalId',
    owner: {
      id: 'ownerId',
    },
    uacApprovedLocations: ['UKL'],
    requestedButExcludedLocations: [],
    dueDateForStatus: new Date(),
    deadlines: { ...defaultDueDateValues },
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
        LocationVoteService,
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

    locationVoteService = module.get<LocationVoteService>(LocationVoteService);
    keycloakUtilService = module.get<KeycloakUtilService>(KeycloakUtilService) as jest.Mocked<KeycloakUtilService>;
    emailService = module.get<EmailService>(EmailService) as jest.Mocked<EmailService>;
  });

  describe('it should send diz mails', () => {
    test.each([true, false])('it should send diz mails, for vote %s', async (vote) => {
      await locationVoteService.handleDizApproval(proposal, vote, mockLocation, proposalUrl);
      if (vote) {
        expect(emailService.send).toHaveBeenCalled();
      } else {
        expect(emailService.send).toHaveBeenCalledTimes(0);
      }
    });
  });

  describe('it should send uac mails', () => {
    test.each([true, false])('it should send uac mails, for vote %s', async (vote) => {
      await locationVoteService.handleUacApproval(proposal, vote, mockLocation, proposalUrl);
      if (vote) {
        expect(emailService.send).toHaveBeenCalled();
      } else {
        expect(emailService.send).toHaveBeenCalledTimes(0);
      }
    });
  });

  describe('vote completion', () => {
    test.each([true, false])('it should send fdpg mails at diz, for vote %s', async (vote) => {
      await locationVoteService.handleDizApproval(
        { ...proposal, numberOfRequestedLocations: 1 },
        vote,
        mockLocation,
        proposalUrl,
      );
      expect(emailService.send).toHaveBeenCalled();
    });
  });

  describe('it should send uac mails', () => {
    test.each([true, false])('it should send fdpg mails at uac, for vote %s', async (vote) => {
      await locationVoteService.handleUacApproval(
        { ...proposal, numberOfRequestedLocations: 1 },
        vote,
        mockLocation,
        proposalUrl,
      );
      expect(emailService.send).toHaveBeenCalled();
    });
  });
});
