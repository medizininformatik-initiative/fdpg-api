import { Test, TestingModule } from '@nestjs/testing';
import { DataDeliveryEventService } from '../data-delivery-event.service';
import { EmailService } from 'src/modules/email/email.service';
import { KeycloakUtilService } from 'src/modules/user/keycloak-util.service';
import { sendMailsUtil } from '../../../send-mails.util';
import { EmailRoleTargets } from 'src/modules/email/types/email-role-targets.enum';
import { EmailCategory } from 'src/modules/email/types/email-category.enum';

jest.mock('../../../send-mails.util', () => ({
  sendMailsUtil: jest.fn(),
}));

describe('DataDeliveryEventService', () => {
  let service: DataDeliveryEventService;
  let emailService: EmailService;
  let keycloakUtilService: KeycloakUtilService;

  const mockProposal = { _id: 'prop123', title: 'Test Proposal' } as any;
  const mockUrl = 'http://test-url.com';
  const mockLocations = [
    { _id: 'loc1', name: 'Berlin' },
    { _id: 'loc2', name: 'Munich' },
  ] as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataDeliveryEventService,
        {
          provide: EmailService,
          useValue: {},
        },
        {
          provide: KeycloakUtilService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<DataDeliveryEventService>(DataDeliveryEventService);
    emailService = module.get<EmailService>(EmailService);
    keycloakUtilService = module.get<KeycloakUtilService>(KeycloakUtilService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleDataDeliveryInitiated', () => {
    it('should call sendMailsUtil with RESEARCHER, DIZ and conditionProposalDataDelivery', async () => {
      await service.handleDataDeliveryInitiated(mockProposal, mockUrl, mockLocations);

      expect(sendMailsUtil).toHaveBeenCalledWith(
        mockProposal,
        mockUrl,
        [EmailRoleTargets.RESEARCHER, EmailRoleTargets.DIZ],
        ['loc1', 'loc2'],
        { conditionProposalDataDelivery: true },
        emailService,
        keycloakUtilService,
        [EmailCategory.DataDelivery],
      );
    });
  });

  describe('handleDataDeliveryDataReady', () => {
    it('should call sendMailsUtil with RESEARCHER, DIZ and conditionProposalDataReady', async () => {
      await service.handleDataDeliveryDataReady(mockProposal, mockUrl, mockLocations);

      expect(sendMailsUtil).toHaveBeenCalledWith(
        mockProposal,
        mockUrl,
        [EmailRoleTargets.RESEARCHER, EmailRoleTargets.DIZ],
        ['loc1', 'loc2'],
        { conditionProposalDataReady: true },
        emailService,
        keycloakUtilService,
        [EmailCategory.DataDelivery],
      );
    });
  });

  describe('handleDataDeliveryDataReturn', () => {
    it('should call sendMailsUtil with RESEARCHER, FDPG and conditionProposalDataReturn (empty locations)', async () => {
      await service.handleDataDeliveryDataReturn(mockProposal, mockUrl);

      expect(sendMailsUtil).toHaveBeenCalledWith(
        mockProposal,
        mockUrl,
        [EmailRoleTargets.RESEARCHER, EmailRoleTargets.FDPG],
        [],
        { conditionProposalDataReturn: true },
        emailService,
        keycloakUtilService,
        [EmailCategory.DataDelivery],
      );
    });
  });
});
