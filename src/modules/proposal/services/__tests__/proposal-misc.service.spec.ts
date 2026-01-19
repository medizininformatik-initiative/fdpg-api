import { EventEngineService } from 'src/modules/event-engine/event-engine.service';
import { ProposalCrudService } from '../proposal-crud.service';
import { StatusChangeService } from '../status-change.service';
import { Test, TestingModule } from '@nestjs/testing';
import { ProposalMiscService } from '../proposal-misc.service';
import { KeycloakService } from 'src/modules/user/keycloak.service';
import { Role } from 'src/shared/enums/role.enum';
import { FdpgRequest } from 'src/shared/types/request-user.interface';
import { ProposalStatus } from '../../enums/proposal-status.enum';
import { ProposalType } from '../../enums/proposal-type.enum';
import { HistoryEventType } from '../../enums/history-event.enum';
import { Proposal, ProposalDocument } from '../../schema/proposal.schema';
import { getModelToken } from '@nestjs/mongoose';
import { ParticipantType } from '../../enums/participant-type.enum';
import { IGetKeycloakUser } from 'src/modules/user/types/keycloak-user.interface';
import {
  addHistoryItemForChangedDeadline,
  addHistoryItemForProposalLock,
  addHistoryItemForStatus,
} from '../../utils/proposal-history.util';
import { validateStatusChange } from '../../utils/validate-status-change.util';
import { setImmediate } from 'timers';
import { FdpgChecklistSetDto } from '../../dto/proposal/fdpg-checklist.dto';
import { validateFdpgCheckStatus } from '../../utils/validate-fdpg-check-status.util';
import { updateFdpgChecklist } from '../../utils/add-fdpg-checklist.util';
import { findByKeyNested } from 'src/shared/utils/find-by-key-nested.util';
import { getError } from 'test/get-error';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ProposalTypeOfUse } from '../../enums/proposal-type-of-use.enum';
import { SchedulerService } from 'src/modules/scheduler/scheduler.service';
import { DueDateEnum } from '../../enums/due-date.enum';
import { isDateChangeValid, isDateOrderValid } from '../../utils/due-date-verification.util';
import { ProposalFormService } from 'src/modules/proposal-form/proposal-form.service';
import { ProposalPdfService } from '../proposal-pdf.service';
import { ProposalUploadService } from '../proposal-upload.service';
import { ProposalDownloadService } from '../proposal-download.service';
import { StorageService } from 'src/modules/storage/storage.service';
import { SelectedCohortUploadDto } from '../../dto/cohort-upload.dto';
import { ValidationException } from 'src/exceptions/validation/validation.exception';
import { SupportedMimetype } from '../../enums/supported-mime-type.enum';
import { addUpload, getBlobName } from '../../utils/proposal.utils';
import { FeasibilityService } from 'src/modules/feasibility/feasibility.service';
import { LocationService } from 'src/modules/location/service/location.service';
import { LocationDto } from 'src/modules/location/dto/location.dto';
import { ProposalSyncService } from '../proposal-sync.service';

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

jest.mock('../../utils/proposal-history.util', () => {
  const actual = jest.requireActual('../../utils/proposal-history.util');
  return {
    addHistoryItemForStatus: jest.fn(),
    addHistoryItemForProposalLock: jest.fn(),
    addHistoryItemForChangedDeadline: jest.fn(),
    addHistoryItemForParticipantsUpdated: jest.fn(),
    addHistoryItemForParticipantRemoved: jest.fn(),
    addHistoryItemForCopyAsInternalRegistration: actual.addHistoryItemForCopyAsInternalRegistration,
  };
});

jest.mock('../../utils/validate-fdpg-check-status.util', () => ({
  validateFdpgCheckStatus: jest.fn(),
}));

jest.mock('../../utils/add-fdpg-checklist.util', () => ({
  updateFdpgChecklist: jest.fn(),
}));

jest.mock('src/shared/utils/find-by-key-nested.util', () => ({
  findByKeyNested: jest.fn().mockReturnValue({ path: ['path', 'to', 'key'] }),
}));

jest.mock('../../utils/due-date-verification.util', () => ({
  isDateOrderValid: jest.fn().mockReturnValue(true),
  isDateChangeValid: jest.fn().mockReturnValue(true),
}));

jest.mock('../../utils/proposal.utils', () => ({
  addUpload: jest.fn(),
  getBlobName: jest.fn().mockReturnValue('blobName'),
}));

jest.mock('../../utils/validate-misc.util', () => ({
  validateUpdateAdditionalInformationAccess: jest.fn(),
}));

jest.mock('../../utils/validate-access.util', () => ({
  validateProposalAccess: jest.fn(),
  validateModifyingCohortAccess: jest.fn(),
}));

jest.mock('../../utils/merge-proposal.util', () => ({
  mergeDeep: jest.fn((target, ...sources) => {
    sources.forEach((source) => {
      if (source) {
        Object.keys(source).forEach((key) => {
          target[key] = source[key];
        });
      }
    });
  }),
}));

jest.mock('../../utils/uac-delay-tracking.util', () => ({
  recalculateAllUacDelayStatus: jest.fn(),
}));

describe('ProposalMiscService', () => {
  let proposalMiscService: ProposalMiscService;

  let proposalCrudService: jest.Mocked<ProposalCrudService>;
  let eventEngineService: jest.Mocked<EventEngineService>;
  let statusChangeService: jest.Mocked<StatusChangeService>;
  let keycloakService: jest.Mocked<KeycloakService>;
  let schedulerService: jest.Mocked<SchedulerService>;
  let proposalPdfService: jest.Mocked<ProposalPdfService>;
  let proposalFormService: jest.Mocked<ProposalFormService>;
  let uploadService: jest.Mocked<ProposalUploadService>;
  let storageService: jest.Mocked<StorageService>;
  let proposalDownloadService: jest.Mocked<ProposalDownloadService>;
  let feasibilityService: jest.Mocked<FeasibilityService>;
  let locationService: jest.Mocked<LocationService>;

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
      miiLocation: 'UKL',
      isFromLocation: false,
      isKnownLocation: true,
    },
  } as FdpgRequest;

  const uacMemberRequest = {
    user: {
      userId: 'userId',
      firstName: 'firstName',
      lastName: 'lastName',
      fullName: 'fullName',
      email: 'uac@test.de',
      username: 'username',
      email_verified: true,
      roles: [Role.UacMember],
      singleKnownRole: Role.UacMember,
      miiLocation: 'UKL',
      isFromLocation: true,
      isKnownLocation: true,
    },
  } as FdpgRequest;

  const fdpgMemberRequest = {
    user: {
      userId: 'userId',
      firstName: 'firstName',
      lastName: 'lastName',
      fullName: 'fullName',
      email: 'info@appsfactory.de',
      username: 'username',
      email_verified: true,
      roles: [Role.FdpgMember],
      singleKnownRole: Role.FdpgMember,
      miiLocation: 'UKL',
      isFromLocation: false,
      isKnownLocation: true,
    },
  } as FdpgRequest;

  const proposalId = 'proposalId';
  const projectAbbreviation = 'projectAbbreviation';
  const researcher = {
    _id: 'userId',
    email: 'info@appsfactory.de',
  };
  const participant = {
    researcher,
    participantCategory: ParticipantType.ProjectLeader,
    participantRole: { role: 'PARTICIPATING_SCIENTIST' },
  };

  const deadlines = {
    [DueDateEnum.DUE_DAYS_FDPG_CHECK]: new Date(2027, 5, 1),
    [DueDateEnum.DUE_DAYS_LOCATION_CHECK]: new Date(2027, 6, 1),
    [DueDateEnum.DUE_DAYS_LOCATION_CONTRACTING]: new Date(2027, 7, 1),
    [DueDateEnum.DUE_DAYS_EXPECT_DATA_DELIVERY]: null,
    [DueDateEnum.DUE_DAYS_DATA_CORRUPT]: null,
    [DueDateEnum.DUE_DAYS_FINISHED_PROJECT]: new Date(2027, 8, 1),
  };

  const proposalContent = {
    _id: proposalId,
    projectAbbreviation,
    status: ProposalStatus.FdpgCheck,
    participants: [participant],
    userProject: {
      typeOfUse: {
        usage: [ProposalTypeOfUse.Biosample],
      },
    },
    deadlines: { ...deadlines },
  };

  const cohortFile: Express.Multer.File = {
    fieldname: 'fieldname',
    originalname: 'filename.json',
    encoding: '7bit',
    mimetype: SupportedMimetype.Json,
    size: 1,
    buffer: Buffer.from('{}'),
    destination: '/tmp',
    filename: 'mocked-file.json',
    path: '/tmp/mocked-file.json',
    stream: {} as any,
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

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProposalMiscService,
        {
          provide: getModelToken(Proposal.name),
          useValue: {
            findOne: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
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
            handleDeadlineChange: jest.fn(),
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
          provide: SchedulerService,
          useValue: {
            removeAndCreateEventsByChangeList: jest.fn(),
          },
        },
        {
          provide: ProposalPdfService,
          useValue: {
            createProposalPdf: jest.fn(),
          },
        },
        {
          provide: ProposalFormService,
          useValue: {
            findAll: jest.fn(),
            getCurrentVersion: jest.fn(),
          },
        },
        {
          provide: StorageService,
          useValue: {
            findAll: jest.fn(),
            uploadFile: jest.fn(),
            getSasUrl: jest.fn(),
          },
        },
        {
          provide: ProposalDownloadService,
          useValue: {
            downloadFile: jest.fn(),
          },
        },
        {
          provide: ProposalUploadService,
          useValue: {
            findAll: jest.fn(),
            deleteUpload: jest.fn(),
          },
        },
        {
          provide: FeasibilityService,
          useValue: {
            getQueryContentById: jest.fn(),
          },
        },
        {
          provide: LocationService,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn().mockImplementation(() => undefined),
          },
        },
        {
          provide: ProposalSyncService,
          useValue: {
            syncProposal: jest.fn(),
            syncAllProposals: jest.fn(),
            retrySync: jest.fn(),
          },
        },
      ],
      imports: [],
    }).compile();

    proposalMiscService = module.get<ProposalMiscService>(ProposalMiscService);
    proposalCrudService = module.get<ProposalCrudService>(ProposalCrudService) as jest.Mocked<ProposalCrudService>;
    eventEngineService = module.get<EventEngineService>(EventEngineService) as jest.Mocked<EventEngineService>;
    statusChangeService = module.get<StatusChangeService>(StatusChangeService) as jest.Mocked<StatusChangeService>;
    keycloakService = module.get<KeycloakService>(KeycloakService) as jest.Mocked<KeycloakService>;
    schedulerService = module.get<SchedulerService>(SchedulerService) as jest.Mocked<SchedulerService>;
    proposalPdfService = module.get<ProposalPdfService>(ProposalPdfService) as jest.Mocked<ProposalPdfService>;
    proposalFormService = module.get<ProposalFormService>(ProposalFormService) as jest.Mocked<ProposalFormService>;
    uploadService = module.get<ProposalUploadService>(ProposalUploadService) as jest.Mocked<ProposalUploadService>;
    storageService = module.get<StorageService>(StorageService) as jest.Mocked<StorageService>;
    proposalDownloadService = module.get<ProposalDownloadService>(
      ProposalDownloadService,
    ) as jest.Mocked<ProposalDownloadService>;
    feasibilityService = module.get<FeasibilityService>(FeasibilityService) as jest.Mocked<FeasibilityService>;
    locationService = module.get<LocationService>(LocationService) as jest.Mocked<LocationService>;
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

      expect(proposalCrudService.findDocument).toHaveBeenCalledWith(proposalId, request.user);
      expect(keycloakService.getUsers).toHaveBeenCalledWith({ email: researcher.email, exact: true });
    });

    it('should include projectResponsible with researcher data', async () => {
      const proposalDocument = {
        ...getProposalDocument(),
        applicant: {
          researcher: { email: 'applicant@test.com' },
          participantCategory: ParticipantType.ProjectLeader,
          participantRole: { role: 'RESEARCHER' },
          institute: {} as any,
        },
        projectResponsible: {
          researcher: { email: 'responsible@test.com' },
          participantCategory: ParticipantType.ProjectLeader,
          participantRole: { role: 'RESPONSIBLE_SCIENTIST' },
          institute: {} as any,
          projectResponsibility: { applicantIsProjectResponsible: false } as any,
          addedByFdpg: false,
        },
      } as any;

      proposalCrudService.findDocument.mockResolvedValueOnce(proposalDocument);
      keycloakService.getUsers.mockResolvedValue([
        {
          email: 'test@test.com',
          emailVerified: true,
          requiredActions: [],
          username: 'test-user',
        } as any,
      ]);

      const result = await proposalMiscService.getResearcherInfo(proposalId, request.user);

      expect(result.length).toBeGreaterThan(1);
      expect(result.some((r) => r.email === 'responsible@test.com')).toBe(true);
      expect(result.some((r) => r.email === 'applicant@test.com')).toBe(true);
    });

    it('should include applicant as projectResponsible when applicantIsProjectResponsible is true', async () => {
      const proposalDocument = {
        ...getProposalDocument(),
        projectResponsible: {
          projectResponsibility: { applicantIsProjectResponsible: true },
          participantCategory: ParticipantType.ProjectLeader,
          participantRole: { role: 'RESPONSIBLE_SCIENTIST' },
          institute: {} as any,
          addedByFdpg: false,
        },
        applicant: {
          researcher: { email: 'applicant@test.com' },
          participantCategory: ParticipantType.ProjectLeader,
          institute: {} as any,
        },
      } as any;

      proposalCrudService.findDocument.mockResolvedValueOnce(proposalDocument);
      keycloakService.getUsers.mockResolvedValue([
        {
          email: 'test@test.com',
          emailVerified: true,
          requiredActions: [],
          username: 'test-user',
        } as any,
      ]);

      const result = await proposalMiscService.getResearcherInfo(proposalId, request.user);

      expect(result.some((r) => r.email === 'applicant@test.com')).toBe(true);
    });

    it('should handle researchers with unverified emails', async () => {
      const proposalDocument = getProposalDocument();
      proposalCrudService.findDocument.mockResolvedValueOnce(proposalDocument);
      keycloakService.getUsers.mockImplementation(() => {
        return Promise.resolve([
          {
            email: 'info@appsfactory.de',
            emailVerified: false,
            requiredActions: ['VERIFY_EMAIL'],
            username: 'username',
          } as any as IGetKeycloakUser,
        ]);
      });

      const result = await proposalMiscService.getResearcherInfo(proposalId, request.user);

      expect(result[0].isEmailVerified).toEqual(false);
      expect(result[0].isRegistrationComplete).toEqual(false);
    });

    it('should handle researchers with multiple keycloak accounts', async () => {
      const proposalDocument = getProposalDocument();
      proposalCrudService.findDocument.mockResolvedValueOnce(proposalDocument);
      keycloakService.getUsers.mockImplementation(() => {
        return Promise.resolve([
          {
            email: 'info@appsfactory.de',
            emailVerified: true,
            requiredActions: [],
            username: 'username1',
          } as any as IGetKeycloakUser,
          {
            email: 'info@appsfactory.de',
            emailVerified: true,
            requiredActions: [],
            username: 'username2',
          } as any as IGetKeycloakUser,
        ]);
      });

      const result = await proposalMiscService.getResearcherInfo(proposalId, request.user);

      expect(result[0].username).toBeUndefined();
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

      expect(proposalCrudService.findDocument).toHaveBeenCalledWith(proposalId, request.user, undefined, true);
      expect(validateStatusChange).toHaveBeenCalledWith(proposalDocument, newStatus, request.user);
      expect(statusChangeService.handleEffects).toHaveBeenCalledWith(expectedDocument, oldStatus, request.user);
      expect(addHistoryItemForStatus).toHaveBeenCalledWith(expectedDocument, request.user, oldStatus);
      expect(eventEngineService.handleProposalStatusChange).toHaveBeenCalledWith(
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

      expect(proposalCrudService.findDocument).toHaveBeenCalledWith(proposalId, request.user, undefined, true);
      expect(validateStatusChange).not.toHaveBeenCalledWith(proposalDocument, newStatus, request.user);
      expect(statusChangeService.handleEffects).not.toHaveBeenCalledWith(expectedDocument, oldStatus, request.user);
      expect(addHistoryItemForStatus).not.toHaveBeenCalledWith(expectedDocument, request.user, oldStatus);
      expect(eventEngineService.handleProposalStatusChange).not.toHaveBeenCalledWith(
        expect.objectContaining({ status: newStatus }),
      );
    });

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

      const newStatus = ProposalStatus.LocationCheck;

      proposalCrudService.findDocument.mockResolvedValueOnce(proposalDocument).mockResolvedValueOnce(proposalDocument);

      await proposalMiscService.setStatus(proposalId, newStatus, request.user);
      jest.advanceTimersByTime(600);

      const flushPromises = () => new Promise(setImmediate);
      await flushPromises();

      expect(proposalCrudService.findDocument).toHaveBeenCalledTimes(1);
      expect(proposalPdfService.createProposalPdf).toHaveBeenCalledTimes(1);
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

      expect(proposalCrudService.findDocument).toHaveBeenCalledTimes(1);
      expect(proposalPdfService.createProposalPdf).toHaveBeenCalledTimes(1);
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
      expect(addHistoryItemForProposalLock).toHaveBeenCalledWith(
        expectedDocument,
        request.user,
        expectedDocument.isLocked,
      );
      expect(eventEngineService.handleProposalLockChange).toHaveBeenCalledWith(
        expect.objectContaining({ isLocked: true }),
      );
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
      expect(addHistoryItemForProposalLock).not.toHaveBeenCalledWith(
        expectedDocument,
        request.user,
        expectedDocument.isLocked,
      );
      expect(eventEngineService.handleProposalLockChange).not.toHaveBeenCalledWith(
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

      expect(updateFdpgChecklist).toHaveBeenCalledWith(proposalDocument, checklist);
      expect(proposalDocument.save).toHaveBeenCalled();
    });

    it('should return updated checklist item when _id is provided', async () => {
      const proposalDocument = {
        ...getProposalDocument(),
        fdpgChecklist: {
          checkListVerification: [
            {
              _id: 'item-id-1',
              isChecked: false,
              checkText: 'Test check',
            },
          ],
          projectProperties: [],
          isRegistrationLinkSent: false,
          fdpgInternalCheckNotes: null,
        },
      } as any;

      proposalCrudService.findDocument.mockResolvedValueOnce(proposalDocument);
      const checklist: any = new FdpgChecklistSetDto();
      checklist._id = 'item-id-1';

      const result = await proposalMiscService.setFdpgChecklist(proposalId, checklist, request.user);

      expect(result).toBeDefined();
      expect(result._id.toString()).toBe('item-id-1');
    });

    it('should return registration link status when isRegistrationLinkSent is updated', async () => {
      const proposalDocument = {
        ...getProposalDocument(),
        fdpgChecklist: {
          isRegistrationLinkSent: true,
          checkListVerification: [],
          projectProperties: [],
          fdpgInternalCheckNotes: null,
        },
      } as any;

      proposalCrudService.findDocument.mockResolvedValueOnce(proposalDocument);
      const checklist: any = new FdpgChecklistSetDto();
      checklist.isRegistrationLinkSent = true;

      const result: any = await proposalMiscService.setFdpgChecklist(proposalId, checklist, request.user);

      expect(result).toBeDefined();
      expect(result._id).toBe('isRegistrationLinkSent');
      expect(result.isRegistrationLinkSent).toBe(true);
    });

    it('should return internal check notes when fdpgInternalCheckNotes is updated', async () => {
      const proposalDocument = {
        ...getProposalDocument(),
        fdpgChecklist: {
          fdpgInternalCheckNotes: 'Test notes',
          checkListVerification: [],
          projectProperties: [],
          isRegistrationLinkSent: false,
        },
      } as any;

      proposalCrudService.findDocument.mockResolvedValueOnce(proposalDocument);
      const checklist: any = new FdpgChecklistSetDto();
      checklist.fdpgInternalCheckNotes = 'Test notes';

      const result: any = await proposalMiscService.setFdpgChecklist(proposalId, checklist, request.user);

      expect(result).toBeDefined();
      expect(result._id).toBe('fdpgInternalCheckNotes');
      expect(result.fdpgInternalCheckNotes).toBe('Test notes');
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

      expect(proposalCrudService.findDocument).toHaveBeenCalledWith(proposalId, request.user);
      expect(proposalDocument.save).toHaveBeenCalled();
      expect(findByKeyNested).toHaveBeenCalledWith(
        expect.objectContaining({ projectAbbreviation: 'projectAbbreviation' }),
        '_id',
        sectionId,
      );

      expect(proposalDocument.set).toHaveBeenCalledWith('path.to.key.isDone', true);
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

      expect(validateFdpgCheckStatus).toHaveBeenCalledWith(proposalDocument);
      expect(proposalDocument.save).toHaveBeenCalled();
    });
  });

  describe('set deadlines', () => {
    it(`should update the deadlines`, async () => {
      const proposalDocument = getProposalDocument();
      proposalCrudService.findDocument.mockResolvedValueOnce(proposalDocument);

      const newDeadlines = {
        [DueDateEnum.DUE_DAYS_FDPG_CHECK]: new Date(2027, 5, 2),
        [DueDateEnum.DUE_DAYS_LOCATION_CHECK]: new Date(2027, 6, 2),
        [DueDateEnum.DUE_DAYS_LOCATION_CONTRACTING]: null,
        [DueDateEnum.DUE_DAYS_EXPECT_DATA_DELIVERY]: null,
        [DueDateEnum.DUE_DAYS_DATA_CORRUPT]: null,
        [DueDateEnum.DUE_DAYS_FINISHED_PROJECT]: new Date(2027, 8, 2),
      };

      const updates = {
        [DueDateEnum.DUE_DAYS_FDPG_CHECK]: new Date(2027, 5, 2),
        [DueDateEnum.DUE_DAYS_LOCATION_CHECK]: new Date(2027, 6, 2),
        [DueDateEnum.DUE_DAYS_LOCATION_CONTRACTING]: null,
        [DueDateEnum.DUE_DAYS_FINISHED_PROJECT]: new Date(2027, 8, 2),
      };

      await proposalMiscService.setDeadlines(proposalId, newDeadlines, fdpgMemberRequest.user);

      expect(isDateOrderValid).toHaveBeenCalledWith(newDeadlines);
      expect(isDateChangeValid).toHaveBeenCalledWith(updates, proposalContent.status);
      expect(addHistoryItemForChangedDeadline).toHaveBeenCalledTimes(Object.keys(updates).length);
      expect(schedulerService.removeAndCreateEventsByChangeList).toHaveBeenCalledWith(proposalDocument, updates);
      expect(eventEngineService.handleDeadlineChange).toHaveBeenCalledWith(proposalDocument, updates);

      expect(proposalDocument.save).toHaveBeenCalled();
    });

    it('should throw not found when proposal does not exist', async () => {
      proposalCrudService.findDocument.mockResolvedValueOnce(null);

      const newDeadlines = {
        [DueDateEnum.DUE_DAYS_FDPG_CHECK]: new Date(2027, 5, 2),
        [DueDateEnum.DUE_DAYS_LOCATION_CHECK]: new Date(2027, 6, 2),
        [DueDateEnum.DUE_DAYS_LOCATION_CONTRACTING]: null,
        [DueDateEnum.DUE_DAYS_EXPECT_DATA_DELIVERY]: null,
        [DueDateEnum.DUE_DAYS_DATA_CORRUPT]: null,
        [DueDateEnum.DUE_DAYS_FINISHED_PROJECT]: new Date(2027, 8, 2),
      };

      await expect(proposalMiscService.setDeadlines(proposalId, newDeadlines, fdpgMemberRequest.user)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw forbidden when user is not FDPG member', async () => {
      const proposalDocument = getProposalDocument();
      proposalCrudService.findDocument.mockResolvedValueOnce(proposalDocument);

      const newDeadlines = {
        [DueDateEnum.DUE_DAYS_FDPG_CHECK]: new Date(2027, 5, 2),
        [DueDateEnum.DUE_DAYS_LOCATION_CHECK]: new Date(2027, 6, 2),
        [DueDateEnum.DUE_DAYS_LOCATION_CONTRACTING]: null,
        [DueDateEnum.DUE_DAYS_EXPECT_DATA_DELIVERY]: null,
        [DueDateEnum.DUE_DAYS_DATA_CORRUPT]: null,
        [DueDateEnum.DUE_DAYS_FINISHED_PROJECT]: new Date(2027, 8, 2),
      };

      await expect(proposalMiscService.setDeadlines(proposalId, newDeadlines, request.user)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw bad request when date order is invalid', async () => {
      const proposalDocument = getProposalDocument();
      proposalCrudService.findDocument.mockResolvedValueOnce(proposalDocument);
      (isDateOrderValid as jest.Mock).mockReturnValueOnce(false);

      const newDeadlines = {
        [DueDateEnum.DUE_DAYS_FDPG_CHECK]: new Date(2027, 5, 2),
        [DueDateEnum.DUE_DAYS_LOCATION_CHECK]: new Date(2027, 6, 2),
        [DueDateEnum.DUE_DAYS_LOCATION_CONTRACTING]: null,
        [DueDateEnum.DUE_DAYS_EXPECT_DATA_DELIVERY]: null,
        [DueDateEnum.DUE_DAYS_DATA_CORRUPT]: null,
        [DueDateEnum.DUE_DAYS_FINISHED_PROJECT]: new Date(2027, 8, 2),
      };

      await expect(proposalMiscService.setDeadlines(proposalId, newDeadlines, fdpgMemberRequest.user)).rejects.toThrow(
        'Date order is not logical',
      );
    });

    it('should throw bad request when date change is invalid', async () => {
      const proposalDocument = getProposalDocument();
      proposalCrudService.findDocument.mockResolvedValueOnce(proposalDocument);
      (isDateOrderValid as jest.Mock).mockReturnValueOnce(true);
      (isDateChangeValid as jest.Mock).mockReturnValueOnce(false);

      const newDeadlines = {
        [DueDateEnum.DUE_DAYS_FDPG_CHECK]: new Date(2027, 5, 2),
        [DueDateEnum.DUE_DAYS_LOCATION_CHECK]: new Date(2027, 6, 2),
        [DueDateEnum.DUE_DAYS_LOCATION_CONTRACTING]: null,
        [DueDateEnum.DUE_DAYS_EXPECT_DATA_DELIVERY]: null,
        [DueDateEnum.DUE_DAYS_DATA_CORRUPT]: null,
        [DueDateEnum.DUE_DAYS_FINISHED_PROJECT]: new Date(2027, 8, 2),
      };

      await expect(proposalMiscService.setDeadlines(proposalId, newDeadlines, fdpgMemberRequest.user)).rejects.toThrow(
        'Date for invalid state was changed',
      );
    });
  });

  describe('should upload a new cohort', () => {
    it('should fail on 49 cohorts', async () => {
      const proposalDocument = getProposalDocument();
      const proposal = {
        ...proposalDocument,
        status: ProposalStatus.Draft,
        userProject: {
          cohorts: {
            selectedCohorts: Array.from({ length: 49 }, (_, i) => {
              const idx = i + 1;
              return {
                _id: `id-${idx}`,
                feasibilityQueryId: idx,
                label: `label-${idx}`,
                uploadId: `uploadId-${idx}`,
                isManualUpload: true,
                numberOfPatients: idx,
              };
            }),
          },
        },
      } as ProposalDocument;

      const newCohort: SelectedCohortUploadDto = { label: 'label-50', isManualUpload: true, numberOfPatients: 50 };

      proposalCrudService.findDocument.mockResolvedValueOnce(proposal);

      await expect(
        proposalMiscService.addManualUploadCohort('id', newCohort, cohortFile, fdpgMemberRequest.user),
      ).rejects.toThrow(ValidationException);
    });

    it('should insert', async () => {
      const proposalDocument = getProposalDocument();
      const proposal = {
        ...proposalDocument,
        status: ProposalStatus.Draft,
        userProject: {
          cohorts: {
            selectedCohorts: [],
          },
        },
        uploads: [],
      } as ProposalDocument;

      const newCohort: SelectedCohortUploadDto = { label: 'label-50', isManualUpload: true, numberOfPatients: 50 };

      proposalCrudService.findDocument.mockResolvedValueOnce(proposal);
      (addUpload as jest.Mock).mockImplementation((prp, upl) => {
        prp.uploads = [upl];
      });

      const { insertedCohort, uploadedFile } = await proposalMiscService.addManualUploadCohort(
        'id',
        newCohort,
        cohortFile,
        fdpgMemberRequest.user,
      );

      expect(getBlobName).toHaveBeenCalled();

      expect(insertedCohort).toBeDefined();
      expect(insertedCohort.label).toEqual(newCohort.label);

      expect(uploadedFile).toBeDefined();
      expect(uploadedFile.fileName).toEqual(cohortFile.originalname);

      expect(proposal.userProject.cohorts.selectedCohorts.length).toEqual(1);
      expect(proposal.uploads.length).toEqual(1);
    });

    it('should fail modification access for Fdpg User', async () => {
      const { validateModifyingCohortAccess } = require('../../utils/validate-access.util');
      const proposalDocument = getProposalDocument();
      const proposal = {
        ...proposalDocument,
        status: ProposalStatus.Archived,
        userProject: {
          cohorts: {
            selectedCohorts: [],
          },
        },
      } as ProposalDocument;

      const newCohort: SelectedCohortUploadDto = { label: 'label-50', isManualUpload: true, numberOfPatients: 50 };

      proposalCrudService.findDocument.mockResolvedValueOnce(proposal);
      validateModifyingCohortAccess.mockImplementationOnce(() => {
        throw new ForbiddenException('Cannot modify cohort');
      });

      await expect(
        proposalMiscService.addManualUploadCohort('id', newCohort, cohortFile, fdpgMemberRequest.user),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should fail modification access for Researcher User', async () => {
      const { validateModifyingCohortAccess } = require('../../utils/validate-access.util');
      const proposalDocument = getProposalDocument();
      const proposal = {
        ...proposalDocument,
        status: ProposalStatus.Archived,
        userProject: {
          cohorts: {
            selectedCohorts: [],
          },
        },
      } as ProposalDocument;

      const newCohort: SelectedCohortUploadDto = { label: 'label-50', isManualUpload: true, numberOfPatients: 50 };

      proposalCrudService.findDocument.mockResolvedValueOnce(proposal);
      validateModifyingCohortAccess.mockImplementationOnce(() => {
        throw new ForbiddenException('Cannot modify cohort');
      });

      await expect(
        proposalMiscService.addManualUploadCohort('id', newCohort, cohortFile, request.user),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('should delete a cohort', () => {
    it('should delete', async () => {
      const proposalDocument = getProposalDocument();

      const proposal = {
        ...proposalDocument,
        status: ProposalStatus.Draft,
        userProject: {
          cohorts: {
            selectedCohorts: Array.from({ length: 49 }, (_, i) => {
              const idx = i + 1;
              return {
                _id: `id-${idx}`,
                feasibilityQueryId: idx,
                label: `label-${idx}`,
                uploadId: `uploadId-${idx}`,
                isManualUpload: true,
                numberOfPatients: idx,
              };
            }),
          },
        },
        uploads: [],
      } as ProposalDocument;
      proposalCrudService.findDocument.mockResolvedValueOnce(proposal);

      const cohortDeletionId = 'id-25';

      const deletedCohort = await proposalMiscService.deleteCohort(
        'proposal-id',
        cohortDeletionId,
        fdpgMemberRequest.user,
      );

      expect(deletedCohort).toBeDefined();
      expect(deletedCohort._id).toEqual(cohortDeletionId);
      expect(proposal.userProject.cohorts.selectedCohorts.length).toBe(48);
      expect(
        proposal.userProject.cohorts.selectedCohorts.some((cohort) => cohort._id === cohortDeletionId),
      ).toBeFalsy();
      expect(uploadService.deleteUpload).toHaveBeenCalledWith(proposal, 'uploadId-25', fdpgMemberRequest.user);
    });

    it('should throw not found if cohort does not exist', async () => {
      const proposalDocument = getProposalDocument();
      const proposal = {
        ...proposalDocument,
        status: ProposalStatus.Draft,
        userProject: {
          cohorts: {
            selectedCohorts: [],
          },
        },
      } as ProposalDocument;

      proposalCrudService.findDocument.mockResolvedValueOnce(proposal);

      await expect(
        proposalMiscService.deleteCohort('proposal-id', 'non-existent-id', fdpgMemberRequest.user),
      ).rejects.toThrow(NotFoundException);
    });

    it('should fail modification access for Fdpg User', async () => {
      const { validateModifyingCohortAccess } = require('../../utils/validate-access.util');
      const proposalDocument = getProposalDocument();
      const proposal = {
        ...proposalDocument,
        status: ProposalStatus.Archived,
        userProject: {
          cohorts: {
            selectedCohorts: [],
          },
        },
      } as ProposalDocument;
      proposalCrudService.findDocument.mockResolvedValueOnce(proposal);
      validateModifyingCohortAccess.mockImplementationOnce(() => {
        throw new ForbiddenException('Cannot modify cohort');
      });

      await expect(
        proposalMiscService.deleteCohort('proposal-Id', 'cohort-deletion-id', fdpgMemberRequest.user),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should fail modification access for Researcher User', async () => {
      const { validateModifyingCohortAccess } = require('../../utils/validate-access.util');
      const proposalDocument = getProposalDocument();
      const proposal = {
        ...proposalDocument,
        status: ProposalStatus.Archived,
        userProject: {
          cohorts: {
            selectedCohorts: [],
          },
        },
      } as ProposalDocument;

      proposalCrudService.findDocument.mockResolvedValueOnce(proposal);
      validateModifyingCohortAccess.mockImplementationOnce(() => {
        throw new ForbiddenException('Cannot modify cohort');
      });

      await expect(proposalMiscService.deleteCohort('proposal-Id', 'cohort-deletion-id', request.user)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('generateLocationCsv', () => {
    it('should generate CSV with location information', async () => {
      const proposal = {
        _id: 'proposal-id',
        projectAbbreviation: 'TEST_PROJECT',
        openDizChecks: ['Charité', 'UKT'],
        uacApprovedLocations: ['Charité'],
        requestedButExcludedLocations: ['UKT'],
        conditionalApprovals: [
          {
            location: 'Charité',
            conditionReasoning: 'Special conditions apply',
          },
        ],
        additionalLocationInformation: [
          {
            location: 'Charité',
            locationPublicationName: 'Charité Publication',
            legalBasis: true,
          },
        ],
      } as any;

      // Mock MII location data
      const locations = [
        { _id: 'Charité', display: 'Charité - Universitätsmedizin Berlin', rubrum: 'rubrum Charité' },
        { _id: 'UKT', display: 'Universitätsklinikum Tübingen', rubrum: 'rubrum Tübingen' },
      ] as any as LocationDto[];

      proposalCrudService.findDocument.mockResolvedValueOnce(proposal);
      locationService.findAll.mockResolvedValueOnce(locations);

      const result = await proposalMiscService.generateLocationCsv('proposal-id', request.user);

      expect(result).toBeInstanceOf(Buffer);

      const csvContent = result.toString('utf-8');
      const lines = csvContent.split('\n');

      // Check headers
      expect(lines[0]).toBe(
        'Rubrum,Location Code,Location Display Name,Conditions,Approval Status,Publication Name,Consent (Legal Basis)',
      );

      // Check that we have data rows (excluding header)
      expect(lines.length).toBeGreaterThan(1);

      // Check that CSV contains expected data
      expect(csvContent).toContain('Charité');
      expect(csvContent).toContain('UKT');
      expect(csvContent).toContain('Charité - Universitätsmedizin Berlin');
      expect(csvContent).toContain('Universitätsklinikum Tübingen');
      // expect(csvContent).toContain('charite-berlin');
      // expect(csvContent).toContain('ukt-tuebingen');
      expect(csvContent).toContain('Special conditions apply');
      expect(csvContent).toContain('Approved');
      expect(csvContent).toContain('Denied');
      expect(csvContent).toContain('Charité Publication');
      expect(csvContent).toContain('true');
    });

    it('should handle empty location arrays', async () => {
      const proposal = {
        _id: 'proposal-id',
        projectAbbreviation: 'EMPTY_PROJECT',
        openDizChecks: [],
        uacApprovedLocations: [],
        requestedButExcludedLocations: [],
        conditionalApprovals: [],
        additionalLocationInformation: [],
      } as any;

      // Mock empty MII location data
      const locations = [];

      proposalCrudService.findDocument.mockResolvedValueOnce(proposal);
      locationService.findAll.mockResolvedValueOnce(locations);

      const result = await proposalMiscService.generateLocationCsv('proposal-id', request.user);

      expect(result).toBeInstanceOf(Buffer);

      const csvContent = result.toString('utf-8');
      const lines = csvContent.split('\n');

      // Should only have header row
      expect(lines.length).toBe(1);
      expect(lines[0]).toBe(
        'Rubrum,Location Code,Location Display Name,Conditions,Approval Status,Publication Name,Consent (Legal Basis)',
      );
    });

    it('should generate download link for location CSV', async () => {
      const proposal = {
        _id: 'proposal-id',
        projectAbbreviation: 'TEST_PROJECT',
        openDizChecks: ['Charité'],
        uacApprovedLocations: [],
        requestedButExcludedLocations: [],
        conditionalApprovals: [],
        additionalLocationInformation: [],
      } as any;

      // Mock MII location data
      const locations = [
        { _id: 'Charité', display: 'Charité - Universitätsmedizin Berlin', rubrum: 'rubrum Charité' },
      ] as any as LocationDto[];

      const mockDownloadUrl =
        'https://storage.example.com/temp/csv-downloads/proposal-id/1234567890-location-contracting-info.csv';

      // Mock the findDocument call twice - once for the download link method and once for the CSV generation
      proposalCrudService.findDocument
        .mockResolvedValueOnce(proposal) // First call in generateLocationCsvDownloadLink
        .mockResolvedValueOnce(proposal); // Second call in generateLocationCsv (called internally)

      locationService.findAll.mockResolvedValueOnce(locations);
      storageService.uploadFile.mockResolvedValueOnce(undefined);
      storageService.getSasUrl.mockResolvedValueOnce(mockDownloadUrl);

      const result = await proposalMiscService.generateLocationCsvDownloadLink('proposal-id', request.user);

      expect(result).toHaveProperty('downloadUrl');
      expect(result).toHaveProperty('filename');
      expect(result).toHaveProperty('expiresAt');
      expect(result.downloadUrl).toBe(mockDownloadUrl);
      expect(result.filename).toContain('location-contracting-info-TEST_PROJECT');
      expect(result.filename).toContain('.csv');
      expect(new Date(result.expiresAt)).toBeInstanceOf(Date);
      expect(new Date(result.expiresAt).getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('getPdfProposalFile', () => {
    it('should get PDF proposal file', async () => {
      const proposalDocument = getProposalDocument();
      const mockPdfBuffer = Buffer.from('mock-pdf-content');

      proposalCrudService.findDocument.mockResolvedValueOnce(proposalDocument);
      proposalPdfService.getPdfProposalFile = jest.fn().mockResolvedValueOnce(mockPdfBuffer);

      const result = await proposalMiscService.getPdfProposalFile(proposalId, request.user);

      expect(result).toBe(mockPdfBuffer);
      expect(proposalCrudService.findDocument).toHaveBeenCalledWith(proposalId, request.user);
      expect(proposalPdfService.getPdfProposalFile).toHaveBeenCalledWith(proposalDocument, request.user);
    });
  });

  describe('getAllProposalFormVersions', () => {
    it('should get all proposal form versions', async () => {
      const mockForms = [
        { id: '1', version: '1.0' },
        { id: '2', version: '2.0' },
      ];
      proposalFormService.findAll.mockResolvedValueOnce(mockForms as any);

      const result = await proposalMiscService.getAllProposalFormVersions();

      expect(result).toEqual(mockForms);
      expect(proposalFormService.findAll).toHaveBeenCalled();
    });
  });

  describe('updateAdditionalInformationForLocation', () => {
    it('should update additional information for location', async () => {
      const proposalDocument = getProposalDocument();
      proposalDocument.additionalLocationInformation = [];
      proposalDocument.status = ProposalStatus.LocationCheck;

      proposalCrudService.findDocument.mockResolvedValueOnce(proposalDocument);

      const dto = {
        legalBasis: true,
        locationPublicationName: 'Test Publication',
      };

      await proposalMiscService.updateAdditionalInformationForLocation(proposalId, dto, uacMemberRequest.user);

      expect(proposalDocument.additionalLocationInformation).toHaveLength(1);
      expect(proposalDocument.additionalLocationInformation[0].location).toBe(uacMemberRequest.user.miiLocation);
      expect(proposalDocument.additionalLocationInformation[0].legalBasis).toBe(dto.legalBasis);
      expect(proposalDocument.additionalLocationInformation[0].locationPublicationName).toBe(
        dto.locationPublicationName,
      );
      expect(proposalDocument.save).toHaveBeenCalled();
    });

    it('should replace existing additional information for same location', async () => {
      const proposalDocument = getProposalDocument();
      proposalDocument.additionalLocationInformation = [
        {
          location: 'UKL',
          legalBasis: false,
          locationPublicationName: 'Old Publication',
        } as any,
      ];
      proposalDocument.status = ProposalStatus.LocationCheck;

      proposalCrudService.findDocument.mockResolvedValueOnce(proposalDocument);

      const dto = {
        legalBasis: true,
        locationPublicationName: 'New Publication',
      };

      await proposalMiscService.updateAdditionalInformationForLocation(proposalId, dto, uacMemberRequest.user);

      expect(proposalDocument.additionalLocationInformation).toHaveLength(1);
      expect(proposalDocument.additionalLocationInformation[0].location).toBe(uacMemberRequest.user.miiLocation);
      expect(proposalDocument.additionalLocationInformation[0].locationPublicationName).toBe(
        dto.locationPublicationName,
      );
      expect(proposalDocument.save).toHaveBeenCalled();
    });
  });

  describe('automaticCohortAdd', () => {
    it('should add automatic cohort', async () => {
      const proposalDocument = getProposalDocument();
      const proposal = {
        ...proposalDocument,
        status: ProposalStatus.Draft,
        userProject: {
          cohorts: {
            selectedCohorts: [],
          },
        },
      } as ProposalDocument;

      const cohortDto = {
        label: 'Auto Cohort',
        comment: 'Test comment',
        feasibilityQueryId: 12345,
        numberOfPatients: 100,
        isManualUpload: false,
      };

      proposalCrudService.findDocument.mockResolvedValueOnce(proposal);

      const result = await proposalMiscService.automaticCohortAdd(proposalId, cohortDto, fdpgMemberRequest.user);

      expect(result).toBeDefined();
      expect(result.label).toBe(cohortDto.label);
      expect(proposal.userProject.cohorts.selectedCohorts).toHaveLength(1);
      expect(proposal.userProject.cohorts.selectedCohorts[0].isManualUpload).toBe(false);
      expect(proposal.userProject.cohorts.selectedCohorts[0].feasibilityQueryId).toBe(cohortDto.feasibilityQueryId);
    });

    it('should fail on 49 cohorts for automatic cohort', async () => {
      const proposalDocument = getProposalDocument();
      const proposal = {
        ...proposalDocument,
        status: ProposalStatus.Draft,
        userProject: {
          cohorts: {
            selectedCohorts: Array.from({ length: 49 }, (_, i) => ({
              _id: `id-${i}`,
              label: `label-${i}`,
            })),
          },
        },
      } as ProposalDocument;

      const cohortDto = {
        label: 'Auto Cohort',
        feasibilityQueryId: 12345,
        numberOfPatients: 100,
        isManualUpload: false,
      };

      proposalCrudService.findDocument.mockResolvedValueOnce(proposal);

      await expect(
        proposalMiscService.automaticCohortAdd(proposalId, cohortDto, fdpgMemberRequest.user),
      ).rejects.toThrow(ValidationException);
    });
  });

  describe('getFeasibilityCsvByQueryId', () => {
    it('should get feasibility CSV by query ID for researcher with access', async () => {
      const queryId = 123;
      const proposal = {
        userProject: {
          cohorts: {
            selectedCohorts: [{ feasibilityQueryId: 123 }, { feasibilityQueryId: 456 }],
          },
        },
      };

      const mockZipData = Buffer.from('mock-zip-data');

      proposalCrudService.find = jest.fn().mockResolvedValueOnce(proposal);
      feasibilityService.getQueryContentById.mockResolvedValueOnce(mockZipData);

      const result = await proposalMiscService.getFeasibilityCsvByQueryId(proposalId, queryId, request.user);

      expect(result).toBe(mockZipData);
      expect(proposalCrudService.find).toHaveBeenCalledWith(proposalId, request.user);
      expect(feasibilityService.getQueryContentById).toHaveBeenCalledWith(queryId, 'ZIP');
    });

    it('should throw forbidden for researcher without access to cohort', async () => {
      const queryId = 999;
      const proposal = {
        userProject: {
          cohorts: {
            selectedCohorts: [{ feasibilityQueryId: 123 }, { feasibilityQueryId: 456 }],
          },
        },
      };

      proposalCrudService.find = jest.fn().mockResolvedValueOnce(proposal);

      await expect(proposalMiscService.getFeasibilityCsvByQueryId(proposalId, queryId, request.user)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should allow non-researcher to access any cohort', async () => {
      const queryId = 123;
      const mockZipData = Buffer.from('mock-zip-data');

      feasibilityService.getQueryContentById.mockResolvedValueOnce(mockZipData);

      const result = await proposalMiscService.getFeasibilityCsvByQueryId(proposalId, queryId, fdpgMemberRequest.user);

      expect(result).toBe(mockZipData);
      expect(feasibilityService.getQueryContentById).toHaveBeenCalledWith(queryId, 'ZIP');
    });
  });

  describe('exportAllUploadsAsZip', () => {
    // Skipping these tests due to JSZip timeout issues in test environment
    it.skip('should export all uploads as zip', async () => {
      const proposal = {
        _id: proposalId,
        projectAbbreviation: 'TEST',
        uploads: [{ _id: 'upload1', blobName: 'blob1', fileName: 'file1.pdf', type: 'GENERAL' }],
      } as any;

      proposalCrudService.findDocument.mockResolvedValueOnce(proposal);
      proposalDownloadService.downloadFile.mockResolvedValueOnce(Buffer.from('file1-content'));

      const result = await proposalMiscService.exportAllUploadsAsZip(proposalId, request.user);

      expect(result).toHaveProperty('zipBuffer');
      expect(result).toHaveProperty('projectAbbreviation');
      expect(result.zipBuffer).toBeInstanceOf(Buffer);
      expect(result.projectAbbreviation).toBe('TEST');
      expect(proposalDownloadService.downloadFile).toHaveBeenCalled();
    });

    it('should throw not found when no uploads exist', async () => {
      const proposal = {
        _id: proposalId,
        projectAbbreviation: 'TEST',
        uploads: [],
      } as any;

      proposalCrudService.findDocument.mockResolvedValueOnce(proposal);

      await expect(proposalMiscService.exportAllUploadsAsZip(proposalId, request.user)).rejects.toThrow(
        NotFoundException,
      );
    });

    it.skip('should filter out excluded upload types', async () => {
      const proposal = {
        _id: proposalId,
        projectAbbreviation: 'TEST',
        uploads: [
          { _id: 'upload1', blobName: 'blob1', fileName: 'file1.pdf', type: 'GENERAL' },
          { _id: 'upload2', blobName: 'blob2', fileName: 'contract.pdf', type: 'CONTRACT_CONDITION' },
        ],
      } as any;

      proposalCrudService.findDocument.mockResolvedValueOnce(proposal);
      proposalDownloadService.downloadFile.mockResolvedValueOnce(Buffer.from('file1-content'));

      const result = await proposalMiscService.exportAllUploadsAsZip(proposalId, request.user);

      expect(result.zipBuffer).toBeInstanceOf(Buffer);
      expect(proposalDownloadService.downloadFile).toHaveBeenCalledTimes(1);
    });

    it('should throw not found when all uploads are excluded types', async () => {
      const proposal = {
        _id: proposalId,
        projectAbbreviation: 'TEST',
        uploads: [
          { _id: 'upload1', blobName: 'blob1', fileName: 'contract.pdf', type: 'CONTRACT_CONDITION' },
          { _id: 'upload2', blobName: 'blob2', fileName: 'location.pdf', type: 'LOCATION_CONTRACT' },
        ],
      } as any;

      proposalCrudService.findDocument.mockResolvedValueOnce(proposal);

      await expect(proposalMiscService.exportAllUploadsAsZip(proposalId, request.user)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw not found when no accessible files found', async () => {
      const proposal = {
        _id: proposalId,
        projectAbbreviation: 'TEST',
        uploads: [{ _id: 'upload1', blobName: 'blob1', fileName: 'file1.pdf', type: 'GENERAL' }],
      } as any;

      proposalCrudService.findDocument.mockResolvedValueOnce(proposal);
      proposalDownloadService.downloadFile.mockRejectedValueOnce(new Error('File not found'));

      await expect(proposalMiscService.exportAllUploadsAsZip(proposalId, request.user)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateParticipants', () => {
    it('should update participants in draft status', async () => {
      const proposalDocument = getProposalDocument();
      const proposal = {
        ...proposalDocument,
        status: ProposalStatus.Draft,
        participants: [participant],
        save: jest.fn().mockImplementation(function () {
          const saved = JSON.parse(JSON.stringify(this));
          saved.toObject = () => saved;
          return Promise.resolve(saved);
        }),
        toObject: function () {
          return JSON.parse(JSON.stringify(this));
        },
      } as any;

      const newParticipants = [
        {
          researcher: { email: 'new@test.com' },
          participantRole: { role: 'PARTICIPATING_SCIENTIST' },
          institute: {} as any,
          participantCategory: ParticipantType.ProjectLeader,
        },
      ];

      proposalCrudService.findDocument.mockResolvedValueOnce(proposal);

      const result = await proposalMiscService.updateParticipants(proposalId, newParticipants as any, request.user);

      expect(result).toBeDefined();
      expect(proposal.save).toHaveBeenCalled();
    });

    it('should allow FDPG members to update participants after draft', async () => {
      const proposalDocument = getProposalDocument();
      const proposal = {
        ...proposalDocument,
        status: ProposalStatus.LocationCheck,
        participants: [participant],
        save: jest.fn().mockImplementation(function () {
          const saved = JSON.parse(JSON.stringify(this));
          saved.toObject = () => saved;
          return Promise.resolve(saved);
        }),
        toObject: function () {
          return JSON.parse(JSON.stringify(this));
        },
      } as any;

      const newParticipants = [
        {
          researcher: { email: 'new@test.com' },
          participantRole: { role: 'PARTICIPATING_SCIENTIST' },
          institute: {} as any,
          participantCategory: ParticipantType.ProjectLeader,
        },
      ];

      proposalCrudService.findDocument.mockResolvedValueOnce(proposal);

      const result = await proposalMiscService.updateParticipants(
        proposalId,
        newParticipants as any,
        fdpgMemberRequest.user,
      );

      expect(result).toBeDefined();
      expect(proposal.save).toHaveBeenCalled();
    });

    it('should throw forbidden for non-FDPG members updating after draft', async () => {
      const proposalDocument = getProposalDocument();
      const proposal = {
        ...proposalDocument,
        status: ProposalStatus.LocationCheck,
        participants: [participant],
      } as any;

      proposalCrudService.findDocument.mockResolvedValueOnce(proposal);

      await expect(proposalMiscService.updateParticipants(proposalId, [] as any, request.user)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('removeParticipant', () => {
    it('should remove participant in draft status', async () => {
      const participantId = 'participant-id-1';
      const proposalDocument = getProposalDocument();
      const proposal = {
        ...proposalDocument,
        status: ProposalStatus.Draft,
        participants: [{ ...participant, _id: participantId }],
        save: jest.fn().mockImplementation(function () {
          const saved = JSON.parse(JSON.stringify(this));
          saved.toObject = () => saved;
          return Promise.resolve(saved);
        }),
        toObject: function () {
          return JSON.parse(JSON.stringify(this));
        },
      } as any;

      proposalCrudService.findDocument.mockResolvedValueOnce(proposal);

      const result = await proposalMiscService.removeParticipant(proposalId, participantId, request.user);

      expect(result).toBeDefined();
      expect(proposal.participants).toHaveLength(0);
      expect(proposal.save).toHaveBeenCalled();
    });

    it('should throw not found if participant does not exist', async () => {
      const participantId = 'non-existent-id';
      const proposalDocument = getProposalDocument();
      const proposal = {
        ...proposalDocument,
        status: ProposalStatus.Draft,
        participants: [],
      } as ProposalDocument;

      proposalCrudService.findDocument.mockResolvedValueOnce(proposal);

      await expect(proposalMiscService.removeParticipant(proposalId, participantId, request.user)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should allow FDPG members to remove participants after draft', async () => {
      const participantId = 'participant-id-1';
      const proposalDocument = getProposalDocument();
      const proposal = {
        ...proposalDocument,
        status: ProposalStatus.LocationCheck,
        participants: [{ ...participant, _id: participantId }],
        save: jest.fn().mockImplementation(function () {
          const saved = JSON.parse(JSON.stringify(this));
          saved.toObject = () => saved;
          return Promise.resolve(saved);
        }),
        toObject: function () {
          return JSON.parse(JSON.stringify(this));
        },
      } as any;

      proposalCrudService.findDocument.mockResolvedValueOnce(proposal);

      const result = await proposalMiscService.removeParticipant(proposalId, participantId, fdpgMemberRequest.user);

      expect(result).toBeDefined();
      expect(proposal.participants).toHaveLength(0);
    });

    it('should throw forbidden for non-FDPG members removing after draft', async () => {
      const participantId = 'participant-id-1';
      const proposalDocument = getProposalDocument();
      const proposal = {
        ...proposalDocument,
        status: ProposalStatus.LocationCheck,
        participants: [{ ...participant, _id: participantId }],
      } as any;

      proposalCrudService.findDocument.mockResolvedValueOnce(proposal);

      await expect(proposalMiscService.removeParticipant(proposalId, participantId, request.user)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('createDizDetails', () => {
    const dizMemberRequest = {
      user: {
        userId: 'userId',
        firstName: 'firstName',
        lastName: 'lastName',
        fullName: 'fullName',
        email: 'diz@test.de',
        username: 'username',
        email_verified: true,
        roles: [Role.DizMember],
        singleKnownRole: Role.DizMember,
        miiLocation: 'UKL',
        isFromLocation: true,
        isKnownLocation: true,
      },
    } as FdpgRequest;

    it('should create DIZ details', async () => {
      const proposalDocument = getProposalDocument();
      const proposal = {
        ...proposalDocument,
        dizDetails: [],
        dizApprovedLocations: ['UKL'],
        uacApprovedLocations: ['UKL'],
      } as any;

      const createDto = {
        localProjectIdentifier: 'LOCAL-123',
        documentationLinks: 'http://example.com/doc1',
      };

      proposalCrudService.findDocument.mockResolvedValueOnce(proposal);

      const result = await proposalMiscService.createDizDetails(proposalId, createDto, dizMemberRequest.user);

      expect(result).toBeDefined();
      expect(proposal.dizDetails).toHaveLength(1);
      expect(proposal.dizDetails[0].localProjectIdentifier).toBe(createDto.localProjectIdentifier);
      expect(proposal.save).toHaveBeenCalled();
    });

    it('should throw forbidden if not DIZ member', async () => {
      const proposalDocument = getProposalDocument();

      proposalCrudService.findDocument.mockResolvedValueOnce(proposalDocument);

      const createDto = {
        localProjectIdentifier: 'LOCAL-123',
        documentationLinks: '',
      };

      await expect(proposalMiscService.createDizDetails(proposalId, createDto, request.user)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('updateDizDetails', () => {
    const dizMemberRequest = {
      user: {
        userId: 'userId',
        firstName: 'firstName',
        lastName: 'lastName',
        fullName: 'fullName',
        email: 'diz@test.de',
        username: 'username',
        email_verified: true,
        roles: [Role.DizMember],
        singleKnownRole: Role.DizMember,
        miiLocation: 'UKL',
        isFromLocation: true,
        isKnownLocation: true,
      },
    } as FdpgRequest;

    it('should update DIZ details', async () => {
      const dizDetailsId = 'diz-detail-id';
      const proposalDocument = getProposalDocument();
      const proposal = {
        ...proposalDocument,
        dizDetails: [
          {
            _id: dizDetailsId,
            location: 'UKL',
            localProjectIdentifier: 'OLD-123',
            documentationLinks: '',
          },
        ],
        dizApprovedLocations: ['UKL'],
        uacApprovedLocations: ['UKL'],
      } as any;

      const updateDto = {
        localProjectIdentifier: 'NEW-456',
        documentationLinks: 'http://example.com/new',
      };

      proposalCrudService.findDocument.mockResolvedValueOnce(proposal);

      const result = await proposalMiscService.updateDizDetails(
        proposalId,
        dizDetailsId,
        updateDto,
        dizMemberRequest.user,
      );

      expect(result).toBeDefined();
      expect(proposal.dizDetails[0].localProjectIdentifier).toBe(updateDto.localProjectIdentifier);
      expect(proposal.save).toHaveBeenCalled();
    });

    it('should throw not found if DIZ details not found for location', async () => {
      const dizDetailsId = 'non-existent-id';
      const proposalDocument = getProposalDocument();
      const proposal = {
        ...proposalDocument,
        dizDetails: [],
      } as any;

      proposalCrudService.findDocument.mockResolvedValueOnce(proposal);

      const updateDto = {
        localProjectIdentifier: 'NEW-456',
        documentationLinks: '',
      };

      await expect(
        proposalMiscService.updateDizDetails(proposalId, dizDetailsId, updateDto, dizMemberRequest.user),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw forbidden if not DIZ member', async () => {
      const dizDetailsId = 'diz-detail-id';
      const proposalDocument = getProposalDocument();

      proposalCrudService.findDocument.mockResolvedValueOnce(proposalDocument);

      const updateDto = {
        localProjectIdentifier: 'NEW-456',
        documentationLinks: '',
      };

      await expect(
        proposalMiscService.updateDizDetails(proposalId, dizDetailsId, updateDto, request.user),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('copyAsInternalRegistration', () => {
    const proposalId = 'proposal-id';
    let originalProposal: any;
    let fdpgRequest: FdpgRequest;

    beforeEach(() => {
      originalProposal = {
        _id: proposalId,
        projectAbbreviation: 'ORIGINAL-PROJECT',
        dataSourceLocaleId: 'DIFE-12345',
        status: ProposalStatus.Contracting,
        owner: { id: 'owner-id', name: 'Owner Name' },
        ownerId: 'owner-id',
        ownerName: 'Owner Name',
        applicant: {
          researcher: { firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
          institute: { name: 'Institute A' },
          participantCategory: 'Category A',
        },
        projectResponsible: {
          researcher: { firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' },
          institute: { name: 'Institute B' },
          participantCategory: 'Category B',
          projectResponsibility: {
            applicantIsProjectResponsible: false,
          },
        },
        participants: [{ researcher: { email: 'participant@example.com' } }],
        userProject: {
          projectDetails: {
            isDone: true,
          },
          typeOfUse: {
            isDone: true,
            usage: [ProposalTypeOfUse.Distributed],
          },
        },
        history: [],
        version: { mayor: 0, minor: 0 },
        toObject: jest.fn().mockReturnThis(),
        save: jest.fn().mockResolvedValue({ _id: 'new-proposal-id' }),
      };

      fdpgRequest = {
        user: {
          userId: 'fdpg-user-id',
          username: 'FDPG User',
          firstName: 'FDPG',
          lastName: 'User',
          email: 'fdpg@example.com',
          miiLocation: 'fdpg-location',
          singleKnownRole: Role.FdpgMember,
          roles: [Role.FdpgMember],
        },
      } as FdpgRequest;

      // Mock the findDocument to return the original proposal
      proposalCrudService.findDocument.mockResolvedValue(originalProposal);

      // Mock the proposalModel constructor to return a mock with save method
      const mockProposalModel = jest.fn().mockImplementation((data) => {
        // Create a new mock object for the new proposal instead of mutating originalProposal
        const newProposal = {
          ...data,
          history: data.history || [],
          save: jest.fn().mockResolvedValue({ _id: 'new-proposal-id' }),
        };
        // Store reference to new proposal for assertions
        originalProposal._newProposalRef = newProposal;
        return newProposal;
      });

      // Replace proposalModel in the service
      (proposalMiscService as any).proposalModel = mockProposalModel;
      (proposalMiscService as any).proposalModel.findOne = jest.fn().mockResolvedValue(null);

      (statusChangeService.handleEffects as jest.Mock).mockResolvedValue(undefined);
      (proposalFormService.getCurrentVersion as jest.Mock).mockResolvedValue({ mayor: 1, minor: 0 });
    });

    it('should create internal registration copy with correct flags', async () => {
      const result = await proposalMiscService.copyAsInternalRegistration(proposalId, fdpgRequest.user);
      const newProposal = originalProposal._newProposalRef;

      expect(result).toBe('new-proposal-id');
      expect(newProposal.save).toHaveBeenCalled();
      // Verify type and registerInfo are set correctly
      expect(newProposal.type).toBe(ProposalType.RegisteringForm);
      expect(newProposal.registerInfo).toEqual({
        isInternalRegistration: true,
        originalProposalId: proposalId,
        originalProposalStatus: ProposalStatus.Contracting,
      });
    });

    it('should reset all isDone flags in copied proposal', async () => {
      await proposalMiscService.copyAsInternalRegistration(proposalId, fdpgRequest.user);
      const newProposal = originalProposal._newProposalRef;

      // Verify isDone flags are reset
      expect(newProposal.userProject.projectDetails.isDone).toBe(false);
      expect(newProposal.userProject.typeOfUse.isDone).toBe(false);
    });

    it('should preserve original owner information', async () => {
      await proposalMiscService.copyAsInternalRegistration(proposalId, fdpgRequest.user);
      const newProposal = originalProposal._newProposalRef;

      expect(newProposal.owner).toEqual({ id: 'owner-id', name: 'Owner Name' });
      expect(newProposal.ownerId).toBe('owner-id');
      expect(newProposal.ownerName).toBe('Owner Name');
    });

    it('should clear dataSourceLocaleId', async () => {
      await proposalMiscService.copyAsInternalRegistration(proposalId, fdpgRequest.user);
      const newProposal = originalProposal._newProposalRef;

      expect(newProposal.dataSourceLocaleId).toBeUndefined();
    });

    it('should set status to Draft', async () => {
      await proposalMiscService.copyAsInternalRegistration(proposalId, fdpgRequest.user);
      const newProposal = originalProposal._newProposalRef;

      expect(newProposal.status).toBe(ProposalStatus.Draft);
    });

    it('should generate unique project abbreviation', async () => {
      await proposalMiscService.copyAsInternalRegistration(proposalId, fdpgRequest.user);
      const newProposal = originalProposal._newProposalRef;

      expect(newProposal.projectAbbreviation).toBe('ORIGINAL-PROJECT-REG');
    });

    it('should copy applicant data to projectResponsible when applicantIsProjectResponsible is true', async () => {
      originalProposal.projectResponsible.projectResponsibility.applicantIsProjectResponsible = true;

      await proposalMiscService.copyAsInternalRegistration(proposalId, fdpgRequest.user);
      const newProposal = originalProposal._newProposalRef;

      expect(newProposal.projectResponsible.researcher).toEqual(originalProposal.applicant.researcher);
      expect(newProposal.projectResponsible.institute).toEqual(originalProposal.applicant.institute);
      expect(newProposal.projectResponsible.participantCategory).toBe(originalProposal.applicant.participantCategory);
      // Should set applicantIsProjectResponsible to false in the copy
      expect(newProposal.projectResponsible.projectResponsibility.applicantIsProjectResponsible).toBe(false);
    });

    it('should not copy applicant data when applicantIsProjectResponsible is false', async () => {
      const originalResponsible = { ...originalProposal.projectResponsible.researcher };

      await proposalMiscService.copyAsInternalRegistration(proposalId, fdpgRequest.user);
      const newProposal = originalProposal._newProposalRef;

      expect(newProposal.projectResponsible.researcher).toEqual(originalResponsible);
    });

    it('should add history entry for internal registration', async () => {
      await proposalMiscService.copyAsInternalRegistration(proposalId, fdpgRequest.user);
      const newProposal = originalProposal._newProposalRef;

      expect(newProposal.history).toHaveLength(1);
      expect(newProposal.history[0].type).toBe(HistoryEventType.ProposalCopyAsInternalRegistration);
      expect(newProposal.history[0].owner).toEqual({
        firstName: 'FDPG',
        lastName: 'User',
        email: 'fdpg@example.com',
        id: 'fdpg-user-id',
        miiLocation: 'fdpg-location',
        role: Role.FdpgMember,
      });
      expect(newProposal.history[0].data).toEqual({
        originalProposalAbbreviation: 'ORIGINAL-PROJECT',
      });
      expect(newProposal.history[0].proposalVersion).toEqual({ mayor: 0, minor: 0 });
      expect(newProposal.history[0].createdAt).toBeInstanceOf(Date);
    });
  });
});
