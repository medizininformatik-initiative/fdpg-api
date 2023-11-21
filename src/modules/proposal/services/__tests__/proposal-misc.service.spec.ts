import { StorageService } from 'src/modules/storage/storage.service';
import { EventEngineService } from 'src/modules/event-engine/event-engine.service';
import { ProposalCrudService } from '../proposal-crud.service';
import { StatusChangeService } from '../status-change.service';
import { Test, TestingModule } from '@nestjs/testing';
import { ProposalMiscService } from '../proposal-misc.service';
import { KeycloakService } from 'src/modules/user/keycloak.service';
import { SchedulerRegistry } from '@nestjs/schedule';
import { FeasibilityService } from 'src/modules/feasibility/feasibility.service';
import { PdfEngineService } from 'src/modules/pdf-engine/pdf-engine.service';
import { Role } from 'src/shared/enums/role.enum';
import { MiiLocation } from 'src/shared/constants/mii-locations';
import { FdpgRequest } from 'src/shared/types/request-user.interface';
import { ProposalStatus } from '../../enums/proposal-status.enum';
import { ProposalDocument } from '../../schema/proposal.schema';
import { ParticipantType } from '../../enums/participant-type.enum';
import { IGetKeycloakUser } from 'src/modules/user/types/keycloak-user.interface';
import { addHistoryItemForProposalLock, addHistoryItemForStatus } from '../../utils/proposal-history.util';
import { validateStatusChange } from '../../utils/validate-status-change.util';
import { setImmediate } from 'timers';
import { addUpload, getBlobName } from '../../utils/proposal.utils';
import { UseCaseUpload } from '../../enums/upload-type.enum';
import { SupportedMimetype } from '../../enums/supported-mime-type.enum';
import { FdpgChecklistSetDto } from '../../dto/proposal/fdpg-checklist.dto';
import { validateFdpgCheckStatus } from '../../utils/validate-fdpg-check-status.util';
import { addFdpgChecklist } from '../../utils/add-fdpg-checklist.util';
import { findByKeyNested } from 'src/shared/utils/find-by-key-nested.util';
import { getError } from 'test/get-error';
import { NotFoundException } from '@nestjs/common';
import { AdminConfigService } from 'src/modules/admin/admin-config.service';
import { ProposalTypeOfUse } from '../../enums/proposal-type-of-use.enum';

jest.mock('class-transformer', () => {
  const original = jest.requireActual('class-transformer');
  return {
    ...original,
    plainToClass: jest.fn().mockImplementation((cls, plain, options) => plain),
  };
});

jest.mock('../../utils/validate-status-change.util', () => ({
  validateStatusChange: jest.fn(),
}));

jest.mock('../../utils/proposal-history.util', () => ({
  addHistoryItemForStatus: jest.fn(),
  addHistoryItemForProposalLock: jest.fn(),
}));

jest.mock('../../utils/proposal.utils', () => ({
  addUpload: jest.fn(),
  getBlobName: jest.fn().mockReturnValue('blobName'),
}));

jest.mock('../../utils/validate-fdpg-check-status.util', () => ({
  validateFdpgCheckStatus: jest.fn(),
}));

jest.mock('../../utils/add-fdpg-checklist.util', () => ({
  addFdpgChecklist: jest.fn(),
}));

jest.mock('src/shared/utils/find-by-key-nested.util', () => ({
  findByKeyNested: jest.fn().mockReturnValue({ path: ['path', 'to', 'key'] }),
}));

describe('ProposalMiscService', () => {
  let proposalMiscService: ProposalMiscService;

  let proposalCrudService: jest.Mocked<ProposalCrudService>;
  let eventEngineService: jest.Mocked<EventEngineService>;
  let storageService: jest.Mocked<StorageService>;
  let statusChangeService: jest.Mocked<StatusChangeService>;
  let keycloakService: jest.Mocked<KeycloakService>;
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
    },
  } as FdpgRequest;

  const proposalId = 'proposalId';
  const researcher = {
    _id: 'userId',
    email: 'info@appsfactory.de',
  };
  const participant = { researcher, participantCategory: ParticipantType.ProjectLeader };
  const proposalContent = {
    _id: proposalId,
    projectAbbreviation: 'projectAbbreviation',
    status: ProposalStatus.FdpgCheck,
    participants: [participant],
    userProject: {
      typeOfUse: {
        usage: [ProposalTypeOfUse.Biosample],
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
        headline: {
          de: 'headlineDE',
          en: 'headlineEN',
        },
        text: {
          de: 'textDE',
          en: 'textEN',
        },
      },
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProposalMiscService,
        {
          provide: ProposalCrudService,
          useValue: {
            findDocument: jest.fn(),
          },
        },
        {
          provide: EventEngineService,
          useValue: {
            handleProposalStatusChange: jest.fn(),
            handleProposalLockChange: jest.fn(),
          },
        },
        {
          provide: StorageService,
          useValue: {
            uploadFile: jest.fn(),
          },
        },
        {
          provide: StatusChangeService,
          useValue: {
            handleEffects: jest.fn(),
          },
        },
        {
          provide: KeycloakService,
          useValue: {
            getUsers: jest.fn(),
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

    proposalMiscService = module.get<ProposalMiscService>(ProposalMiscService);
    proposalCrudService = module.get<ProposalCrudService>(ProposalCrudService) as jest.Mocked<ProposalCrudService>;
    eventEngineService = module.get<EventEngineService>(EventEngineService) as jest.Mocked<EventEngineService>;
    storageService = module.get<StorageService>(StorageService) as jest.Mocked<StorageService>;
    statusChangeService = module.get<StatusChangeService>(StatusChangeService) as jest.Mocked<StatusChangeService>;
    keycloakService = module.get<KeycloakService>(KeycloakService) as jest.Mocked<KeycloakService>;
    pdfEngineService = module.get<PdfEngineService>(PdfEngineService) as jest.Mocked<PdfEngineService>;
    schedulerRegistry = module.get<SchedulerRegistry>(SchedulerRegistry) as jest.Mocked<SchedulerRegistry>;
    feasibilityService = module.get<FeasibilityService>(FeasibilityService) as jest.Mocked<FeasibilityService>;
  });

  it('should be defined', () => {
    expect(proposalMiscService).toBeDefined();
  });

  describe('getResearcherInfo', () => {
    it('should return researcher info', async () => {
      const proposalDocument = getProposalDocument();
      proposalCrudService.findDocument.mockResolvedValueOnce(proposalDocument);
      keycloakService.getUsers.mockImplementation((researcher) => {
        return Promise.resolve([
          {
            email: researcher.email,
            emailVerified: true,
            requiredActions: [],
            username: 'username',
          } as any as IGetKeycloakUser,
        ]);
      });
      const result = await proposalMiscService.getResearcherInfo(proposalId, request.user);
      expect(result[0].email).toEqual('info@appsfactory.de');
      expect(result[0].isEmailVerified).toEqual(true);
      expect(result[0].isRegistrationComplete).toEqual(true);
      expect(result[0].username).toEqual('username');

      expect(proposalCrudService.findDocument).toBeCalledWith(proposalId, request.user);
      expect(keycloakService.getUsers).toBeCalledWith({ email: researcher.email, exact: true });
    });
  });

  describe('setStatus', () => {
    it('should set status for contracting', async () => {
      const proposalDocument = getProposalDocument();
      const oldStatus = proposalDocument.status;
      const newStatus = ProposalStatus.Contracting;

      const expectedDocument = {
        ...proposalDocument,
        status: newStatus,
      };
      proposalCrudService.findDocument.mockResolvedValueOnce(proposalDocument);

      await proposalMiscService.setStatus(proposalId, newStatus, request.user);

      expect(proposalCrudService.findDocument).toBeCalledWith(proposalId, request.user, undefined, true);
      expect(validateStatusChange).toBeCalledWith(proposalDocument, newStatus, request.user);
      expect(statusChangeService.handleEffects).toBeCalledWith(expectedDocument, oldStatus, request.user);
      expect(addHistoryItemForStatus).toBeCalledWith(expectedDocument, request.user, oldStatus);
      expect(eventEngineService.handleProposalStatusChange).toBeCalledWith(
        expect.objectContaining({ status: newStatus }),
      );
    });

    it('should set ignore the same status', async () => {
      const proposalDocument = getProposalDocument();
      const oldStatus = proposalDocument.status;
      const newStatus = oldStatus;

      const expectedDocument = {
        ...proposalDocument,
        status: newStatus,
      };
      proposalCrudService.findDocument.mockResolvedValueOnce(proposalDocument);

      await proposalMiscService.setStatus(proposalId, newStatus, request.user);

      expect(proposalCrudService.findDocument).toBeCalledWith(proposalId, request.user, undefined, true);
      expect(validateStatusChange).not.toBeCalledWith(proposalDocument, newStatus, request.user);
      expect(statusChangeService.handleEffects).not.toBeCalledWith(expectedDocument, oldStatus, request.user);
      expect(addHistoryItemForStatus).not.toBeCalledWith(expectedDocument, request.user, oldStatus);
      expect(eventEngineService.handleProposalStatusChange).not.toBeCalledWith(
        expect.objectContaining({ status: newStatus }),
      );
    });

    it('should set status for LocationCheck and get the feasibility query', async () => {
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

      const newStatus = ProposalStatus.LocationCheck;

      proposalCrudService.findDocument.mockResolvedValueOnce(proposalDocument).mockResolvedValueOnce(proposalDocument);

      await proposalMiscService.setStatus(proposalId, newStatus, request.user);
      jest.advanceTimersByTime(600);

      const flushPromises = () => new Promise(setImmediate);
      await flushPromises();

      expect(proposalCrudService.findDocument).toBeCalledTimes(2);
      expect(feasibilityService.getQueryContentById).toBeCalledWith(feasibilityId);
      expect(getBlobName).toBeCalledWith(proposalId, UseCaseUpload.FeasibilityQuery);

      const expectedFile = expect.objectContaining({
        originalname: 'Machbarkeits-Anfrage.json',
        mimetype: SupportedMimetype.Json,
      });
      expect(storageService.uploadFile).toBeCalledWith('blobName', expectedFile, request.user);
    });

    it('should set status for LocationCheck and get the pdf', async () => {
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

      const newStatus = ProposalStatus.LocationCheck;

      proposalCrudService.findDocument.mockResolvedValueOnce(proposalDocument).mockResolvedValueOnce(proposalDocument);

      await proposalMiscService.setStatus(proposalId, newStatus, request.user);
      jest.advanceTimersByTime(600);

      const flushPromises = () => new Promise(setImmediate);
      await flushPromises();

      expect(proposalCrudService.findDocument).toBeCalledTimes(2);

      const expectedDataPrivacy = [{ headline: 'headlineDE', text: 'textDE' }];
      expect(pdfEngineService.createProposalPdf).toBeCalledWith(
        expect.objectContaining({ projectAbbreviation: proposalDocument.projectAbbreviation }),
        expectedDataPrivacy,
      );

      const expectedFile = expect.objectContaining({
        originalname: `${proposalDocument.projectAbbreviation}.pdf`,
        mimetype: SupportedMimetype.Pdf,
      });
      expect(storageService.uploadFile).toBeCalledWith('blobName', expectedFile, request.user);
      expect(addUpload).toBeCalledWith(proposalDocument, expect.anything());
    });
  });

  describe('getDraftProposalFile', () => {
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

      proposalCrudService.findDocument.mockResolvedValueOnce(proposalDocument);

      await proposalMiscService.getDraftProposalFile(proposalId, request.user);

      expect(proposalCrudService.findDocument).toBeCalledTimes(1);

      const expectedDataPrivacy = [{ headline: 'headlineDE', text: 'textDE' }];
      expect(pdfEngineService.createProposalPdf).toBeCalledWith(
        expect.objectContaining({ projectAbbreviation: proposalDocument.projectAbbreviation }),
        expectedDataPrivacy,
      );
      expect(pdfEngineService.createProposalPdf).not.toBeUndefined();
    });
  });

  describe('setIsLockedStatus', () => {
    it('should set isLocked status for a changed status', async () => {
      const proposalDocument = getProposalDocument();
      proposalDocument.isLocked = false;

      const expectedDocument = {
        ...proposalDocument,
        isLocked: true,
      };

      proposalCrudService.findDocument.mockResolvedValueOnce(proposalDocument);

      await proposalMiscService.setIsLockedStatus(proposalId, true, request.user);
      expect(addHistoryItemForProposalLock).toBeCalledWith(expectedDocument, request.user, expectedDocument.isLocked);
      expect(eventEngineService.handleProposalLockChange).toBeCalledWith(expect.objectContaining({ isLocked: true }));
    });

    it('should ignore the same status', async () => {
      const proposalDocument = getProposalDocument();
      proposalDocument.isLocked = true;

      const expectedDocument = {
        ...proposalDocument,
        isLocked: true,
      };

      proposalCrudService.findDocument.mockResolvedValueOnce(proposalDocument);

      await proposalMiscService.setIsLockedStatus(proposalId, true, request.user);
      expect(addHistoryItemForProposalLock).not.toBeCalledWith(
        expectedDocument,
        request.user,
        expectedDocument.isLocked,
      );
      expect(eventEngineService.handleProposalLockChange).not.toBeCalledWith(
        expect.objectContaining({ isLocked: true }),
      );
    });
  });

  describe('setFdpgChecklist', () => {
    it('should set fdpg checklist', async () => {
      const proposalDocument = getProposalDocument();
      proposalCrudService.findDocument.mockResolvedValueOnce(proposalDocument);
      const checklist = new FdpgChecklistSetDto();

      await proposalMiscService.setFdpgChecklist(proposalId, checklist, request.user);

      expect(validateFdpgCheckStatus).toBeCalledWith(proposalDocument);
      expect(addFdpgChecklist).toBeCalledWith(proposalDocument, checklist);
      expect(proposalDocument.save).toBeCalled();
    });
  });

  describe('markSectionAsDone', () => {
    it('should mark section as done', async () => {
      const sectionId = 'sectionId';
      const proposalDocument = {
        ...getProposalDocument(),
        toObject: function () {
          return JSON.parse(JSON.stringify(this));
        },
      } as ProposalDocument;
      proposalCrudService.findDocument.mockResolvedValueOnce(proposalDocument);

      await proposalMiscService.markSectionAsDone(proposalId, sectionId, true, request.user);

      expect(proposalCrudService.findDocument).toBeCalledWith(proposalId, request.user);
      expect(proposalDocument.save).toBeCalled();
      expect(findByKeyNested).toBeCalledWith(
        expect.objectContaining({ projectAbbreviation: 'projectAbbreviation' }),
        '_id',
        sectionId,
      );

      expect(proposalDocument.set).toBeCalledWith('path.to.key.isDone', true);
    });

    it('should throw when section is not found', async () => {
      const sectionId = 'sectionId';
      const proposalDocument = {
        ...getProposalDocument(),
        toObject: function () {
          return JSON.parse(JSON.stringify(this));
        },
      } as ProposalDocument;
      proposalCrudService.findDocument.mockResolvedValueOnce(proposalDocument);
      const findByKeyMock = jest.mocked(findByKeyNested);

      findByKeyMock.mockReturnValueOnce(undefined);

      const call = proposalMiscService.markSectionAsDone(proposalId, sectionId, true, request.user);
      const error = await getError(async () => await call);

      expect(error).toBeInstanceOf(NotFoundException);
    });
  });

  describe('setFdpgCheckNotes', () => {
    it('should set fdpg checkNotes', async () => {
      const proposalDocument = getProposalDocument();
      proposalCrudService.findDocument.mockResolvedValueOnce(proposalDocument);
      const text = 'text';

      await proposalMiscService.setFdpgCheckNotes(proposalId, text, request.user);

      expect(validateFdpgCheckStatus).toBeCalledWith(proposalDocument);
      expect(proposalDocument.save).toBeCalled();
    });
  });
});
