import { KeycloakUtilService } from 'src/modules/user/keycloak-util.service';
import { EmailService } from 'src/modules/email/email.service';
import { MiiLocation } from 'src/shared/constants/mii-locations';
import { Test, TestingModule } from '@nestjs/testing';
import { Proposal } from 'src/modules/proposal/schema/proposal.schema';
import { Role } from 'src/shared/enums/role.enum';
import { PublicationsService } from '../publications.service';
import { PublicationCreateDto } from 'src/modules/proposal/dto/proposal/publication.dto';
import { Publication } from 'src/modules/proposal/schema/sub-schema/publication.schema';

describe('PublicationsService', () => {
  let publicationsService: PublicationsService;
  let keycloakUtilService: KeycloakUtilService;
  let emailService: EmailService;

  const proposal = {
    _id: 'proposalId',
    projectAbbreviation: 'abb',
    owner: {
      id: 'ownerId',
    },
    uacApprovedLocations: [MiiLocation.UKL],
    requestedButExcludedLocations: [],
  } as any as Proposal;

  const proposalUrl = 'proposalUrl';

  const mockLocation = MiiLocation.UKL;

  const mockPublication = { title: 'publicationTitle' } as any as Publication;

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
        PublicationsService,
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

    publicationsService = module.get<PublicationsService>(PublicationsService);
    keycloakUtilService = module.get<KeycloakUtilService>(KeycloakUtilService) as jest.Mocked<KeycloakUtilService>;
    emailService = module.get<EmailService>(EmailService) as jest.Mocked<EmailService>;
  });

  describe('it should send mails', () => {
    it('on create', async () => {
      await publicationsService.handlePublicationCreate(proposal, mockPublication, proposalUrl);
      expect(emailService.send).toHaveBeenCalled();
    });
    it('on update', async () => {
      await publicationsService.handlePublicationUpdate(proposal, mockPublication, proposalUrl);
      expect(emailService.send).toHaveBeenCalled();
    });
    it('on delete', async () => {
      await publicationsService.handlePublicationDelete(proposal, mockPublication, proposalUrl);
      expect(emailService.send).toHaveBeenCalled();
    });
  });
});
