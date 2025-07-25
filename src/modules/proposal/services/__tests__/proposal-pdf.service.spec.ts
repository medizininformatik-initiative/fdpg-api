import { Test, TestingModule } from '@nestjs/testing';
import { ProposalStatus } from '../../enums/proposal-status.enum';
import { ProposalTypeOfUse } from '../../enums/proposal-type-of-use.enum';
import { ProposalDocument } from '../../schema/proposal.schema';
import { ProposalPdfService } from '../proposal-pdf.service';
import { StorageService } from 'src/modules/storage/storage.service';
import { PdfEngineService } from 'src/modules/pdf-engine/pdf-engine.service';
import { SchedulerRegistry } from '@nestjs/schedule';
import { FeasibilityService } from 'src/modules/feasibility/feasibility.service';
import { AdminConfigService } from 'src/modules/admin/admin-config.service';
import { Role } from 'src/shared/enums/role.enum';
import { MiiLocation } from 'src/shared/constants/mii-locations';
import { FdpgRequest } from 'src/shared/types/request-user.interface';
import { getBlobName } from '../../utils/proposal.utils';
import { UseCaseUpload } from '../../enums/upload-type.enum';
import { SupportedMimetype } from '../../enums/supported-mime-type.enum';
import { ParticipantType } from '../../enums/participant-type.enum';
import { PlatformIdentifier } from 'src/modules/admin/enums/platform-identifier.enum';

jest.mock('class-transformer', () => {
  const original = jest.requireActual('class-transformer');
  return {
    ...original,
    plainToClass: jest.fn().mockImplementation((cls, plain, options) => plain),
  };
});

jest.mock('../../utils/proposal-history.util', () => ({
  addHistoryItemForStatus: jest.fn(),
  addHistoryItemForProposalLock: jest.fn(),
  addHistoryItemForChangedDeadline: jest.fn(),
}));

jest.mock('../../utils/proposal.utils', () => ({
  ...jest.requireActual('../../utils/proposal.utils'),
  getBlobName: jest.fn().mockReturnValue('blobName'),
  addUpload: jest.fn(),
}));

describe('ProposalPdfService', () => {
  let proposalPdfService: ProposalPdfService;

  let storageService: jest.Mocked<StorageService>;
  let pdfEngineService: jest.Mocked<PdfEngineService>;
  let schedulerRegistry: jest.Mocked<SchedulerRegistry>;
  let feasibilityService: jest.Mocked<FeasibilityService>;
  let adminConfigService: jest.Mocked<AdminConfigService>;

  const request = {
    user: {
      userId: 'userId',
      firstName: 'firstName',
      lastName: 'lastName',
      fullName: 'fullName',
      email: 'info@appsfactory.de',
      username: 'username',
      email_verified: true,
      roles: [Role.Researcher],
      singleKnownRole: Role.Researcher,
      miiLocation: MiiLocation.UKL,
      isFromLocation: false,
      isKnownLocation: true,
      assignedDataSources: [PlatformIdentifier.Mii],
    },
  } as FdpgRequest;

  const proposalId = 'proposalId';
  const projectAbbreviation = 'projectAbbreviation';
  const researcher = {
    _id: 'userId',
    email: 'info@appsfactory.de',
  };
  const participant = { researcher, participantCategory: ParticipantType.ProjectLeader };

  const proposalContent = {
    _id: proposalId,
    projectAbbreviation,
    status: ProposalStatus.FdpgCheck,
    selectedDataSources: [PlatformIdentifier.Mii],
    participants: [participant],
    userProject: {
      typeOfUse: {
        usage: [ProposalTypeOfUse.Biosample],
        difeUsage: [ProposalTypeOfUse.Distributed],
      },
      feasibility: {
        id: undefined,
      },
      cohorts: {
        selectedCohorts: [
          {
            feasibilityQueryId: 1,
            label: 'label',
            isManualUpload: false,
          },
          {
            feasibilityQueryId: 2,
            label: 'label',
            isManualUpload: true,
          },
        ],
      },
    },
  };

  const getProposalDocument = () => {
    const proposalDocument = {
      ...proposalContent,
      save: jest.fn().mockImplementation(function () {
        return JSON.parse(JSON.stringify(this));
      }),
      set: jest.fn(),
    };
    return proposalDocument as any as ProposalDocument;
  };

  const privacyTextMock = {
    messages: {
      [ProposalTypeOfUse.Biosample]: {
        headline: 'headline',
        text: 'text',
      },
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProposalPdfService,
        {
          provide: StorageService,
          useValue: {
            uploadFile: jest.fn(),
          },
        },
        {
          provide: PdfEngineService,
          useValue: {
            createProposalPdf: jest.fn().mockResolvedValue('buffer' as any as Buffer),
          },
        },
        {
          provide: SchedulerRegistry,
          useValue: {
            addTimeout: jest.fn(),
          },
        },
        {
          provide: FeasibilityService,
          useValue: {
            getQueryContentById: jest.fn().mockResolvedValue({ content: 'content' }),
          },
        },
        {
          provide: AdminConfigService,
          useValue: {
            getDataPrivacyConfig: jest.fn().mockResolvedValue(privacyTextMock),
          },
        },
      ],
      imports: [],
    }).compile();

    proposalPdfService = module.get<ProposalPdfService>(ProposalPdfService) as jest.Mocked<ProposalPdfService>;
    storageService = module.get<StorageService>(StorageService) as jest.Mocked<StorageService>;
    pdfEngineService = module.get<PdfEngineService>(PdfEngineService) as jest.Mocked<PdfEngineService>;
    schedulerRegistry = module.get<SchedulerRegistry>(SchedulerRegistry) as jest.Mocked<SchedulerRegistry>;
    feasibilityService = module.get<FeasibilityService>(FeasibilityService) as jest.Mocked<FeasibilityService>;
  });

  it('should be defined', () => {
    expect(proposalPdfService).toBeDefined();
  });

  describe('getPdfProposalFile', () => {
    it('should call api to generate pdf and return buffer', async () => {
      const proposal = getProposalDocument();
      const proposalDocument = {
        ...proposal,
        userProject: {
          ...proposal.userProject,
          feasibility: {
            id: undefined,
          },
        },
        toObject: function () {
          return JSON.parse(JSON.stringify(this));
        },
      } as any as ProposalDocument;

      await proposalPdfService.getPdfProposalFile(proposalDocument, request.user);
      jest.advanceTimersByTime(600);

      const expectedDataPrivacy = [{ headline: 'headline', text: 'text' }];
      expect(pdfEngineService.createProposalPdf).toHaveBeenCalled();
      expect(pdfEngineService.createProposalPdf).toHaveBeenCalledWith(
        expect.objectContaining({ projectAbbreviation: proposalDocument.projectAbbreviation }),
        expectedDataPrivacy,
        proposalDocument.selectedDataSources,
      );
      expect(pdfEngineService.createProposalPdf).not.toBeUndefined();
    });
  });

  describe('getFeasibilityJson', () => {
    it('should set status for LocationCheck and create the proposal Pdf', async () => {
      const feasibilityId = 'feasibilityId';
      const proposal = getProposalDocument();
      const proposalDocument = {
        ...proposal,
        userProject: {
          ...proposal.userProject,
          feasibility: {
            id: feasibilityId,
          },
        },
        toObject: function () {
          return JSON.parse(JSON.stringify(this));
        },
      } as any as ProposalDocument;

      await proposalPdfService.fetchAndGenerateFeasibilityPdf(proposalDocument, request.user);

      expect(getBlobName).toHaveBeenCalledWith(proposalId, UseCaseUpload.FeasibilityQuery);

      const expectedFile = expect.objectContaining({
        originalname: 'Machbarkeits-Anfrage.json',
        mimetype: SupportedMimetype.Json,
      });
      expect(storageService.uploadFile).toHaveBeenCalledWith('blobName', expectedFile, request.user);
    });
  });
});
