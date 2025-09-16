import { Test, TestingModule } from '@nestjs/testing';
import { SchedulerService } from 'src/modules/scheduler/scheduler.service';
import { StatusChangeService } from '../status-change.service';
import { Role } from 'src/shared/enums/role.enum';
import { ALL_ACTIVE_LOCATIONS, MiiLocation } from 'src/shared/constants/mii-locations';
import { FdpgRequest } from 'src/shared/types/request-user.interface';
import { ProposalStatus } from '../../enums/proposal-status.enum';
import { ProposalDocument } from '../../schema/proposal.schema';
import { setDueDate } from '../../utils/due-date.util';
import { ScheduleType } from 'src/modules/scheduler/enums/schedule-type.enum';
import {
  declineUnansweredConditions,
  declineUnselectedLocations,
  excludeAllRequestedLocations,
} from '../../utils/location-flow.util';
import { removeFdpgTasksForContracting, removeFdpgTasksForDataDelivery } from '../../utils/add-fdpg-task.util';
import { declineUnansweredContracts } from '../../utils/location-flow.util';
import { UacApproval } from '../../schema/sub-schema/uac-approval.schema';
import { initChecklist } from '../../dto/proposal/fdpg-checklist.dto';
import { ProposalPdfService } from '../proposal-pdf.service';

jest.mock('../../utils/due-date.util', () => ({
  setDueDate: jest.fn(),
}));

jest.mock('../../utils/location-flow.util', () => ({
  declineUnansweredConditions: jest.fn(),
  declineUnselectedLocations: jest.fn(),
  declineUnansweredContracts: jest.fn(),
  excludeAllRequestedLocations: jest.fn(),
}));

jest.mock('../../utils/add-fdpg-task.util', () => ({
  removeFdpgTasksForContracting: jest.fn(),
  removeFdpgTasksForDataDelivery: jest.fn(),
}));

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
const proposalContent = {
  _id: proposalId,
  projectAbbreviation: 'projectAbbreviation',
  status: ProposalStatus.Draft,
  version: {
    mayor: 1,
    minor: 0,
  },
  userProject: {
    addressees: {
      desiredLocations: [MiiLocation.UKL],
    },
  },
  requestedButExcludedLocations: [],
  openDizChecks: [MiiLocation.Charité, MiiLocation.KC],
  dizApprovedLocations: [MiiLocation.KUM, MiiLocation.MHH],
  openDizConditionChecks: [MiiLocation.CTK],
  signedContracts: [MiiLocation.MRI, MiiLocation.UKA],
  uacApprovedLocations: [MiiLocation.UKAU, MiiLocation.UKB],
  uacApprovals: [{}] as UacApproval[],
};

const getProposalDocument = () => {
  const proposalDocument = {
    ...proposalContent,
  };
  return proposalDocument as any as ProposalDocument;
};

describe('StatusChangeService', () => {
  let statusChangeService: StatusChangeService;
  let proposalPdfService: ProposalPdfService;

  let schedulerService: jest.Mocked<SchedulerService>;
  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatusChangeService,
        {
          provide: SchedulerService,
          useValue: {
            cancelEventsByTypesForProposal: jest.fn(),
            createEvents: jest.fn(),
            cancelEventsForProposal: jest.fn(),
          },
        },
        {
          provide: ProposalPdfService,
          useValue: {
            fetchAndGenerateFeasibilityPdf: jest.fn(),
          },
        },
      ],
      imports: [],
    }).compile();

    statusChangeService = module.get<StatusChangeService>(StatusChangeService);
    schedulerService = module.get<SchedulerService>(SchedulerService) as jest.Mocked<SchedulerService>;
    proposalPdfService = module.get<ProposalPdfService>(ProposalPdfService) as jest.Mocked<ProposalPdfService>;
  });

  it('should be defined', () => {
    expect(statusChangeService).toBeDefined();
  });

  describe('handleEffects', () => {
    it('should do nothing for the same status', async () => {
      const oldStatus = ProposalStatus.Draft;
      const proposalDocument = getProposalDocument();
      proposalDocument.status = ProposalStatus.Draft;

      await statusChangeService.handleEffects(proposalDocument, oldStatus, request.user);

      expect(setDueDate).not.toHaveBeenCalled();
    });

    describe(ProposalStatus.Rework, () => {
      it('should handle the new status correctly', async () => {
        const oldStatus = ProposalStatus.FdpgCheck;
        const proposalDocument = getProposalDocument();
        proposalDocument.status = ProposalStatus.Rework;

        await statusChangeService.handleEffects(proposalDocument, oldStatus, request.user);

        expect(setDueDate).toHaveBeenCalledWith(proposalDocument);
        expect(schedulerService.cancelEventsByTypesForProposal).toHaveBeenCalledWith(proposalDocument, [
          ScheduleType.ReminderFdpgCheck,
        ]);
        expect(schedulerService.createEvents).toHaveBeenCalledWith({
          proposal: proposalDocument,
          types: [],
        });
      });
    });

    describe(ProposalStatus.FdpgCheck, () => {
      it('should handle the new status correctly', async () => {
        const oldStatus = ProposalStatus.Rework;
        const proposalDocument = getProposalDocument();
        proposalDocument.status = ProposalStatus.FdpgCheck;

        await statusChangeService.handleEffects(proposalDocument, oldStatus, request.user);

        expect(setDueDate).toHaveBeenCalledWith(proposalDocument);
        expect(schedulerService.cancelEventsByTypesForProposal).toHaveBeenCalledWith(proposalDocument, []);
        expect(schedulerService.createEvents).toHaveBeenCalledWith({
          proposal: proposalDocument,
          types: [ScheduleType.ReminderFdpgCheck, ScheduleType.ParticipatingResearcherSummary],
        });

        expect(proposalDocument.version.mayor).toBe(2);
        expect(proposalDocument.version.minor).toBe(0);
        expect(proposalDocument.submittedAt).toBeDefined();
        expect(proposalDocument.fdpgChecklist).toEqual({
          ...initChecklist(),
        });
        expect(proposalPdfService.fetchAndGenerateFeasibilityPdf).toHaveBeenCalledTimes(1);
      });
    });

    describe(ProposalStatus.LocationCheck, () => {
      test.each([true, false])(
        'should handle the new status correctly (allLocations: %s)',
        async (allLocations: boolean) => {
          const oldStatus = ProposalStatus.FdpgCheck;
          const proposalDocument = getProposalDocument();
          proposalDocument.status = ProposalStatus.LocationCheck;
          const locationsRequested = allLocations ? ALL_ACTIVE_LOCATIONS : [MiiLocation.UKL];
          proposalContent.userProject.addressees.desiredLocations = [...locationsRequested];

          await statusChangeService.handleEffects(proposalDocument, oldStatus, request.user);

          expect(setDueDate).toHaveBeenCalledWith(proposalDocument);
          expect(schedulerService.cancelEventsByTypesForProposal).toHaveBeenCalledWith(proposalDocument, [
            ScheduleType.ReminderFdpgCheck,
          ]);
          expect(schedulerService.createEvents).toHaveBeenCalledWith({
            proposal: proposalDocument,
            types: [
              ScheduleType.ReminderLocationCheck1,
              ScheduleType.ReminderLocationCheck2,
              ScheduleType.ReminderLocationCheck3,
              ScheduleType.ParticipatingResearcherSummary,
            ],
          });

          expect(proposalDocument.signedContracts).toEqual([]);
          expect(proposalDocument.dizApprovedLocations).toEqual([]);
          expect(proposalDocument.uacApprovedLocations).toEqual([]);
          expect(proposalDocument.requestedButExcludedLocations).toEqual([]);
          expect(proposalDocument.openDizChecks).toEqual([...locationsRequested]);
          expect(proposalDocument.numberOfRequestedLocations).toBe(proposalDocument.openDizChecks.length);
          expect(proposalDocument.statusChangeToLocationCheckAt).toBeDefined();
        },
      );
    });

    describe(ProposalStatus.Contracting, () => {
      it('should handle the new status correctly', async () => {
        const oldStatus = ProposalStatus.LocationCheck;
        const proposalDocument = getProposalDocument();
        proposalDocument.status = ProposalStatus.Contracting;

        await statusChangeService.handleEffects(proposalDocument, oldStatus, request.user, [MiiLocation.UKAU]);

        expect(setDueDate).toHaveBeenCalledWith(proposalDocument);

        expect(proposalDocument.openDizChecks).toEqual([]);
        expect(proposalDocument.dizApprovedLocations).toEqual([]);
        expect(proposalDocument.signedContracts).toEqual([]);

        expect(proposalDocument.uacApprovedLocations).toEqual([MiiLocation.UKAU, MiiLocation.UKB]);
        expect(proposalDocument.requestedButExcludedLocations).toEqual([
          MiiLocation.Charité,
          MiiLocation.KC,
          MiiLocation.KUM,
          MiiLocation.MHH,
          MiiLocation.MRI,
          MiiLocation.UKA,
          MiiLocation.CTK,
        ]);

        expect(proposalDocument.numberOfApprovedLocations).toBe(proposalDocument.uacApprovedLocations.length);

        expect(schedulerService.cancelEventsByTypesForProposal).toHaveBeenCalledWith(proposalDocument, [
          ScheduleType.ReminderLocationCheck1,
          ScheduleType.ReminderLocationCheck2,
          ScheduleType.ReminderLocationCheck3,
        ]);
        expect(schedulerService.createEvents).toHaveBeenCalledWith({
          proposal: proposalDocument,
          types: [ScheduleType.ParticipatingResearcherSummary],
        });

        expect(declineUnansweredConditions).toHaveBeenCalledWith(
          expect.objectContaining({ _id: proposalId }),
          request.user,
        );
        expect(declineUnselectedLocations).toHaveBeenCalledWith(
          expect.objectContaining({ _id: proposalId }),
          request.user,
          [MiiLocation.UKAU],
        );
        expect(removeFdpgTasksForContracting).toHaveBeenCalledWith(expect.objectContaining({ _id: proposalId }));
      });
    });

    describe(ProposalStatus.ExpectDataDelivery, () => {
      it('should handle the new status correctly', async () => {
        const oldStatus = ProposalStatus.Contracting;
        const proposalDocument = getProposalDocument();
        proposalDocument.status = ProposalStatus.ExpectDataDelivery;

        await statusChangeService.handleEffects(proposalDocument, oldStatus, request.user);

        expect(setDueDate).toHaveBeenCalledWith(proposalDocument);
        expect(schedulerService.cancelEventsByTypesForProposal).toHaveBeenCalledWith(proposalDocument, []);
        expect(schedulerService.createEvents).toHaveBeenCalledWith({
          proposal: proposalDocument,
          types: [ScheduleType.ParticipatingResearcherSummary],
        });

        expect(declineUnansweredContracts).toHaveBeenCalledWith(
          expect.objectContaining({ _id: proposalId }),
          request.user,
        );
        expect(removeFdpgTasksForDataDelivery).toHaveBeenCalledWith(expect.objectContaining({ _id: proposalId }));

        expect(proposalDocument.openDizChecks).toEqual([]);
        expect(proposalDocument.dizApprovedLocations).toEqual([]);
        expect(proposalDocument.uacApprovedLocations).toEqual([]);
        expect(proposalDocument.signedContracts).toEqual([MiiLocation.MRI, MiiLocation.UKA]);
        expect(proposalDocument.requestedButExcludedLocations).toEqual([
          MiiLocation.Charité,
          MiiLocation.KC,
          MiiLocation.KUM,
          MiiLocation.MHH,
          MiiLocation.UKAU,
          MiiLocation.UKB,
          MiiLocation.CTK,
        ]);

        expect(proposalDocument.numberOfSignedLocations).toBe(proposalDocument.signedContracts.length);
      });
    });

    describe(ProposalStatus.DataResearch, () => {
      it('should handle the new status correctly', async () => {
        const oldStatus = ProposalStatus.ExpectDataDelivery;
        const proposalDocument = getProposalDocument();
        proposalDocument.status = ProposalStatus.DataResearch;

        await statusChangeService.handleEffects(proposalDocument, oldStatus, request.user);

        expect(setDueDate).toHaveBeenCalledWith(proposalDocument);
        expect(schedulerService.cancelEventsByTypesForProposal).toHaveBeenCalledWith(proposalDocument, []);
        expect(schedulerService.createEvents).toHaveBeenCalledWith({
          proposal: proposalDocument,
          types: [ScheduleType.ReminderResearcherPublications, ScheduleType.ParticipatingResearcherSummary],
        });
      });
    });

    describe(ProposalStatus.DataCorrupt, () => {
      it('should handle the new status correctly', async () => {
        const oldStatus = ProposalStatus.DataResearch;
        const proposalDocument = getProposalDocument();
        proposalDocument.status = ProposalStatus.DataCorrupt;

        await statusChangeService.handleEffects(proposalDocument, oldStatus, request.user);

        expect(setDueDate).toHaveBeenCalledWith(proposalDocument);
        expect(schedulerService.cancelEventsByTypesForProposal).toHaveBeenCalledWith(proposalDocument, [
          ScheduleType.ReminderResearcherPublications,
        ]);
        expect(schedulerService.createEvents).toHaveBeenCalledWith({
          proposal: proposalDocument,
          types: [],
        });
      });
    });

    describe(ProposalStatus.FinishedProject, () => {
      it('should handle the new status correctly', async () => {
        const oldStatus = ProposalStatus.DataResearch;
        const proposalDocument = getProposalDocument();
        proposalDocument.status = ProposalStatus.FinishedProject;

        await statusChangeService.handleEffects(proposalDocument, oldStatus, request.user);

        expect(setDueDate).toHaveBeenCalledWith(proposalDocument);
        expect(schedulerService.cancelEventsByTypesForProposal).toHaveBeenCalledWith(proposalDocument, [
          ScheduleType.ReminderResearcherPublications,
        ]);
        expect(schedulerService.createEvents).toHaveBeenCalledWith({
          proposal: proposalDocument,
          types: [ScheduleType.ParticipatingResearcherSummary],
        });
      });
    });

    describe(`${ProposalStatus.ReadyToArchive} ${ProposalStatus.Archived} ${ProposalStatus.Draft} `, () => {
      test.each([ProposalStatus.ReadyToArchive, ProposalStatus.Archived, ProposalStatus.Draft])(
        'should handle the new status correctly',
        async (newStatus) => {
          const oldStatus = ProposalStatus.DataResearch;
          const proposalDocument = getProposalDocument();
          proposalDocument.status = newStatus;

          await statusChangeService.handleEffects(proposalDocument, oldStatus, request.user);

          expect(setDueDate).toHaveBeenCalledWith(proposalDocument);
          expect(schedulerService.cancelEventsByTypesForProposal).toHaveBeenCalledWith(proposalDocument, []);
          expect(schedulerService.createEvents).toHaveBeenCalledWith({
            proposal: proposalDocument,
            types: [],
          });
        },
      );
    });

    describe(ProposalStatus.Rejected, () => {
      it('should handle the new status correctly', async () => {
        const oldStatus = ProposalStatus.FdpgCheck;
        const proposalDocument = getProposalDocument();
        proposalDocument.status = ProposalStatus.Rejected;

        await statusChangeService.handleEffects(proposalDocument, oldStatus, request.user);

        expect(setDueDate).toHaveBeenCalledWith(proposalDocument);
        expect(schedulerService.cancelEventsByTypesForProposal).toHaveBeenCalledWith(proposalDocument, []);
        expect(schedulerService.createEvents).toHaveBeenCalledWith({
          proposal: proposalDocument,
          types: [ScheduleType.ParticipatingResearcherSummary],
        });

        expect(excludeAllRequestedLocations).toHaveBeenCalledWith(proposalDocument);
        expect(schedulerService.cancelEventsForProposal).toHaveBeenCalledWith(proposalDocument);
      });
    });
  });
});
