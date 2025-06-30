import { EventEngineService } from 'src/modules/event-engine/event-engine.service';
import { ProposalCrudService } from '../proposal-crud.service';
import { StatusChangeService } from '../status-change.service';
import { Test, TestingModule } from '@nestjs/testing';
import { ProposalMiscService } from '../proposal-misc.service';
import { KeycloakService } from 'src/modules/user/keycloak.service';
import { Role } from 'src/shared/enums/role.enum';
import { MiiLocation } from 'src/shared/constants/mii-locations';
import { FdpgRequest } from 'src/shared/types/request-user.interface';
import { ProposalStatus } from '../../enums/proposal-status.enum';
import { ProposalDocument } from '../../schema/proposal.schema';
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
import { StorageService } from 'src/modules/storage/storage.service';
import { SelectedCohortUploadDto } from '../../dto/cohort-upload.dto';
import { ValidationException } from 'src/exceptions/validation/validation.exception';
import { SupportedMimetype } from '../../enums/supported-mime-type.enum';
import { addUpload, getBlobName } from '../../utils/proposal.utils';
import { FeasibilityService } from 'src/modules/feasibility/feasibility.service';

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
  addHistoryItemForChangedDeadline: jest.fn(),
}));

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
  let feasibilityService: jest.Mocked<FeasibilityService>;

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
      miiLocation: MiiLocation.UKL,
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
          },
        },
        {
          provide: StorageService,
          useValue: {
            findAll: jest.fn(),
            uploadFile: jest.fn(),
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

      expect(proposalCrudService.findDocument).toHaveBeenCalledWith(proposalId, request.user);
      expect(keycloakService.getUsers).toHaveBeenCalledWith({ email: researcher.email, exact: true });
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

      await expect(
        proposalMiscService.addManualUploadCohort('id', newCohort, cohortFile, fdpgMemberRequest.user),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should fail modification access for Researcher User', async () => {
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
    });

    it('should fail modification access for Fdpg User', async () => {
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

      await expect(
        proposalMiscService.deleteCohort('proposal-Id', 'cohort-deletion-id', fdpgMemberRequest.user),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should fail modification access for Researcher User', async () => {
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

      await expect(proposalMiscService.deleteCohort('proposal-Id', 'cohort-deletion-id', request.user)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
