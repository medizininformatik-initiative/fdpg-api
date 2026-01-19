import { Test, TestingModule } from '@nestjs/testing';
import { ProposalDataDeliveryService } from '../proposal-data-delivery.service';
import { ProposalCrudService } from '../../proposal-crud.service';
import { ProposalDataDeliveryCrudService } from '../proposal-data-delivery-crud.service';
import { ProposalDataDeliverySyncService } from '../proposal-data-delivery-sync.service';
import { ProposalDeliveryInfoService } from '../proposal-delivery-info.service';
import { ProposalSubDeliveryService } from '../proposal-sub-delivery.service';
import { EventEngineService } from 'src/modules/event-engine/event-engine.service';
import { LocationService } from 'src/modules/location/service/location.service';
import { Role } from 'src/shared/enums/role.enum';
import { DeliveryAcceptance, SubDeliveryStatus } from '../../../enums/data-delivery.enum';
import { DeliveryInfoStatus } from '../../../enums/delivery-info-status.enum';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

// Mock Utilities
jest.mock('../../../utils/proposal-history.util', () => ({
  addHistoryItemForDmoRequest: jest.fn(),
  addHistoryItemForDmoAcceptanceAnswer: jest.fn(),
  addHistoryItemForInitiateDelivery: jest.fn(),
  addHistoryItemForForwardedDelivery: jest.fn(),
  addHistoryItemForCanceledDelivery: jest.fn(),
  addHistoryItemForDataDeliveryConcluded: jest.fn(),
}));

describe('ProposalDataDeliveryService', () => {
  let service: ProposalDataDeliveryService;
  let crudService: ProposalDataDeliveryCrudService;
  let proposalCrudService: ProposalCrudService;
  let deliveryInfoService: ProposalDeliveryInfoService;
  let syncService: ProposalDataDeliverySyncService;
  let eventEngineService: EventEngineService;
  let subDeliveryService: ProposalSubDeliveryService;

  // Mock User
  const mockUser = { userId: 'user-1', singleKnownRole: Role.Researcher, miiLocation: 'loc-1' } as any;
  const mockProposalId = 'prop-1';

  // Helper to create mock proposal documents
  const createMockProposal = (dataDelivery: any = {}) => ({
    _id: mockProposalId,
    dataDelivery,
    save: jest.fn().mockResolvedValue(true),
    toObject: jest.fn().mockReturnValue({ _id: mockProposalId }),
    history: [],
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProposalDataDeliveryService,
        {
          provide: ProposalCrudService,
          useValue: {
            find: jest.fn(),
            findDocument: jest.fn(),
          },
        },
        {
          provide: ProposalDataDeliveryCrudService,
          useValue: {
            getDataDelivery: jest.fn(),
            createDataDelivery: jest.fn(),
            updateDataDelivery: jest.fn(),
            updateDeliveryInfo: jest.fn(),
            findDeliveryInfoByProposalId: jest.fn(),
          },
        },
        {
          provide: ProposalDataDeliverySyncService,
          useValue: {
            syncDeliveryInfoResultWithDsf: jest.fn(),
            syncSubDeliveryStatusesWithDsf: jest.fn(),
          },
        },
        {
          provide: ProposalDeliveryInfoService,
          useValue: {
            initDeliveryInfo: jest.fn(),
            setToForwardDelivery: jest.fn(),
            setToCancelDelivery: jest.fn(),
            extendDeliveryInfo: jest.fn(),
            setStatusToFetched: jest.fn(),
          },
        },
        {
          provide: ProposalSubDeliveryService,
          useValue: { rateDelivery: jest.fn() },
        },
        {
          provide: EventEngineService,
          useValue: {
            handleDataDeliveryInitiated: jest.fn(),
            handleDataDeliveryDataReturn: jest.fn(),
            handleDataDeliveryDataReady: jest.fn(),
          },
        },
        {
          provide: LocationService,
          useValue: { findAllLookUpMap: jest.fn().mockResolvedValue({}) },
        },
      ],
    }).compile();

    service = module.get<ProposalDataDeliveryService>(ProposalDataDeliveryService);
    crudService = module.get<ProposalDataDeliveryCrudService>(ProposalDataDeliveryCrudService);
    proposalCrudService = module.get<ProposalCrudService>(ProposalCrudService);
    deliveryInfoService = module.get<ProposalDeliveryInfoService>(ProposalDeliveryInfoService);
    syncService = module.get<ProposalDataDeliverySyncService>(ProposalDataDeliverySyncService);
    eventEngineService = module.get<EventEngineService>(EventEngineService);
    subDeliveryService = module.get<ProposalSubDeliveryService>(ProposalSubDeliveryService);

    jest.clearAllMocks();
  });

  describe('getDataDelivery', () => {
    it('should return null if data delivery not found', async () => {
      (crudService.getDataDelivery as jest.Mock).mockResolvedValue(null);
      const result = await service.getDataDelivery(mockProposalId, mockUser);
      expect(result).toBeNull();
    });

    it('should return transformed DTO if found', async () => {
      const mockDD = { acceptance: DeliveryAcceptance.ACCEPTED };
      (crudService.getDataDelivery as jest.Mock).mockResolvedValue(mockDD);

      const result = await service.getDataDelivery(mockProposalId, mockUser);
      expect(result).toBeDefined();
    });
  });

  describe('setDmsVote', () => {
    it('should throw ForbiddenException if DMS user location mismatches', async () => {
      const mockDoc = createMockProposal({ dataManagementSite: 'other-loc' });
      (proposalCrudService.findDocument as jest.Mock).mockResolvedValue(mockDoc);

      const dmsUser = { ...mockUser, singleKnownRole: Role.DataManagementOffice, miiLocation: 'my-loc' };

      await expect(service.setDmsVote(mockProposalId, DeliveryAcceptance.ACCEPTED, dmsUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should update vote and save proposal', async () => {
      const mockDD = { dataManagementSite: 'loc-1', acceptance: DeliveryAcceptance.PENDING };
      const mockDoc = createMockProposal(mockDD);
      (proposalCrudService.findDocument as jest.Mock).mockResolvedValue(mockDoc);

      // Mock the internal call to updateDataDelivery
      const updatedDoc = createMockProposal({ ...mockDD, acceptance: DeliveryAcceptance.ACCEPTED });
      // We need to mock find for updateDataDelivery internal check
      (proposalCrudService.find as jest.Mock).mockResolvedValue({ dataDelivery: mockDD });
      (crudService.updateDataDelivery as jest.Mock).mockResolvedValue(updatedDoc);

      await service.setDmsVote(mockProposalId, DeliveryAcceptance.ACCEPTED, mockUser);

      expect(crudService.updateDataDelivery).toHaveBeenCalledWith(
        mockProposalId,
        expect.objectContaining({ acceptance: DeliveryAcceptance.ACCEPTED }),
        mockUser,
      );
      expect(mockDoc.save).toHaveBeenCalled();
    });
  });

  describe('initDeliveryInfo', () => {
    const initDto = {
      name: 'Del 1',
      manualEntry: false,
      subDeliveries: [{ location: 'loc-1' }],
    } as any;

    it('should initialize info, trigger events, and save', async () => {
      const mockDoc = createMockProposal();
      (proposalCrudService.findDocument as jest.Mock).mockResolvedValue(mockDoc);

      const mockUpdated = createMockProposal({ deliveryInfos: [] });
      (deliveryInfoService.initDeliveryInfo as jest.Mock).mockResolvedValue(mockUpdated);

      await service.initDeliveryInfo(mockProposalId, initDto, mockUser);

      expect(deliveryInfoService.initDeliveryInfo).toHaveBeenCalled();
      expect(mockUpdated.save).toHaveBeenCalled();

      // Since manualEntry is false, event engine should fire
      expect(eventEngineService.handleDataDeliveryInitiated).toHaveBeenCalled();
    });

    it('should NOT trigger event engine if manualEntry is true', async () => {
      const manualDto = { ...initDto, manualEntry: true };
      const mockDoc = createMockProposal();
      (proposalCrudService.findDocument as jest.Mock).mockResolvedValue(mockDoc);

      const mockUpdated = createMockProposal({ deliveryInfos: [] });
      (deliveryInfoService.initDeliveryInfo as jest.Mock).mockResolvedValue(mockUpdated);

      await service.initDeliveryInfo(mockProposalId, manualDto, mockUser);

      expect(eventEngineService.handleDataDeliveryInitiated).not.toHaveBeenCalled();
    });
  });

  describe('rateSubDelivery', () => {
    it('should delegate to subDeliveryService', async () => {
      const mockUpdated = createMockProposal({ deliveryInfos: [] });
      (subDeliveryService.rateDelivery as jest.Mock).mockResolvedValue(mockUpdated);

      await service.rateSubDelivery(mockProposalId, 'd1', 'sub1', SubDeliveryStatus.ACCEPTED);

      expect(subDeliveryService.rateDelivery).toHaveBeenCalledWith(
        mockProposalId,
        'd1',
        'sub1',
        SubDeliveryStatus.ACCEPTED,
      );
      expect(eventEngineService.handleDataDeliveryDataReturn).not.toHaveBeenCalled();
    });

    it('should trigger DataReturn event if status is REPEATED', async () => {
      const mockUpdated = createMockProposal({ deliveryInfos: [] });
      (subDeliveryService.rateDelivery as jest.Mock).mockResolvedValue(mockUpdated);

      await service.rateSubDelivery(mockProposalId, 'd1', 'sub1', SubDeliveryStatus.REPEATED);

      expect(eventEngineService.handleDataDeliveryDataReturn).toHaveBeenCalledWith(mockUpdated);
    });
  });

  describe('setDeliveryInfoStatus', () => {
    const dId = 'd1';

    it('should throw forbidden for invalid status transitions', async () => {
      const dto = { _id: dId, status: 'UNKNOWN' as any } as any;
      (crudService.findDeliveryInfoByProposalId as jest.Mock).mockResolvedValue({ _id: dId });

      await expect(service.setDeliveryInfoStatus(mockProposalId, dto, mockUser)).rejects.toThrow(ForbiddenException);
    });

    it('should sync and update when setting to WAITING_FOR_DATA_SET', async () => {
      const dto = {
        _id: dId,
        status: DeliveryInfoStatus.WAITING_FOR_DATA_SET,
        subDeliveries: [{ location: 'L1' }],
      } as any;
      const mockInfo = { _id: dId, subDeliveries: [{ location: 'L1' }] };

      (crudService.findDeliveryInfoByProposalId as jest.Mock).mockResolvedValue(mockInfo);

      const mockUpdated = createMockProposal({ deliveryInfos: [mockInfo] });
      (crudService.updateDeliveryInfo as jest.Mock).mockResolvedValue(mockUpdated);
      (proposalCrudService.findDocument as jest.Mock).mockResolvedValue(mockUpdated); // for event engine

      await service.setDeliveryInfoStatus(mockProposalId, dto, mockUser);

      expect(deliveryInfoService.setToForwardDelivery).toHaveBeenCalledWith(mockInfo);
      expect(syncService.syncDeliveryInfoResultWithDsf).toHaveBeenCalledWith(mockProposalId, mockInfo);
      expect(crudService.updateDeliveryInfo).toHaveBeenCalled();
      expect(eventEngineService.handleDataDeliveryDataReady).toHaveBeenCalled();
      expect(mockUpdated.save).toHaveBeenCalled();
    });

    it('should cancel delivery when setting to CANCELED', async () => {
      const dto = { _id: dId, status: DeliveryInfoStatus.CANCELED, subDeliveries: [] } as any;
      const mockInfo = { _id: dId };

      (crudService.findDeliveryInfoByProposalId as jest.Mock).mockResolvedValue(mockInfo);
      const mockUpdated = createMockProposal();
      (crudService.updateDeliveryInfo as jest.Mock).mockResolvedValue(mockUpdated);

      await service.setDeliveryInfoStatus(mockProposalId, dto, mockUser);

      expect(deliveryInfoService.setToCancelDelivery).toHaveBeenCalledWith(mockInfo);
      expect(crudService.updateDeliveryInfo).toHaveBeenCalled();
      expect(mockUpdated.save).toHaveBeenCalled();
    });
  });

  describe('syncDeliveryInfoWithDsf', () => {
    const dId = 'd1';

    it('should throw forbidden if status is not syncable', async () => {
      const mockInfo = { _id: dId, status: DeliveryInfoStatus.FETCHED_BY_RESEARCHER };
      (crudService.findDeliveryInfoByProposalId as jest.Mock).mockResolvedValue(mockInfo);

      await expect(service.syncDeliveryInfoWithDsf(mockProposalId, { _id: dId } as any, mockUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should sync sub-deliveries if status is PENDING', async () => {
      const mockInfo = { _id: dId, status: DeliveryInfoStatus.PENDING };
      (crudService.findDeliveryInfoByProposalId as jest.Mock).mockResolvedValue(mockInfo);

      const mockUpdated = createMockProposal();
      (crudService.updateDeliveryInfo as jest.Mock).mockResolvedValue(mockUpdated);

      await service.syncDeliveryInfoWithDsf(mockProposalId, { _id: dId } as any, mockUser);

      expect(syncService.syncSubDeliveryStatusesWithDsf).toHaveBeenCalledWith(mockProposalId, mockInfo);
      expect(syncService.syncDeliveryInfoResultWithDsf).not.toHaveBeenCalled();
    });

    it('should sync result if status is WAITING_FOR_DATA_SET', async () => {
      const mockInfo = { _id: dId, status: DeliveryInfoStatus.WAITING_FOR_DATA_SET };
      (crudService.findDeliveryInfoByProposalId as jest.Mock).mockResolvedValue(mockInfo);

      const mockUpdated = createMockProposal();
      (crudService.updateDeliveryInfo as jest.Mock).mockResolvedValue(mockUpdated);

      await service.syncDeliveryInfoWithDsf(mockProposalId, { _id: dId } as any, mockUser);

      expect(syncService.syncDeliveryInfoResultWithDsf).toHaveBeenCalledWith(mockProposalId, mockInfo);
    });
  });

  describe('extendDeliveryDate', () => {
    it('should throw BadRequest if new date is before old date', async () => {
      const oldDate = new Date('2023-02-01');
      const newDate = new Date('2023-01-01'); // Earlier
      const mockInfo = { _id: 'd1', deliveryDate: oldDate };

      (crudService.findDeliveryInfoByProposalId as jest.Mock).mockResolvedValue(mockInfo);

      await expect(service.extendDeliveryDate(mockProposalId, 'd1', newDate, mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should update date via service and save', async () => {
      const oldDate = new Date('2023-01-01');
      const newDate = new Date('2023-02-01'); // Later
      const mockInfo = { _id: 'd1', deliveryDate: oldDate };

      (crudService.findDeliveryInfoByProposalId as jest.Mock).mockResolvedValue(mockInfo);
      const mockUpdated = createMockProposal();
      (crudService.updateDeliveryInfo as jest.Mock).mockResolvedValue(mockUpdated);

      await service.extendDeliveryDate(mockProposalId, 'd1', newDate, mockUser);

      expect(deliveryInfoService.extendDeliveryInfo).toHaveBeenCalledWith(mockInfo, newDate);
      expect(crudService.updateDeliveryInfo).toHaveBeenCalled();
    });
  });

  describe('setStatusToFetched', () => {
    const dId = 'd1';

    it('should throw error if status is invalid for automated entries', async () => {
      const mockInfo = { _id: dId, manualEntry: false, status: DeliveryInfoStatus.PENDING };
      (crudService.findDeliveryInfoByProposalId as jest.Mock).mockResolvedValue(mockInfo);

      await expect(service.setStatusToFetched(mockProposalId, dId, mockUser)).rejects.toThrow(
        'cannot be set to FETCHED_BY_RESEARCHER',
      );
    });

    it('should allow if valid state (RESULTS_AVAILABLE)', async () => {
      const mockInfo = { _id: dId, manualEntry: false, status: DeliveryInfoStatus.RESULTS_AVAILABLE, name: 'D1' };
      (crudService.findDeliveryInfoByProposalId as jest.Mock).mockResolvedValue(mockInfo);

      const mockUpdated = createMockProposal({ deliveryInfos: [] });
      (crudService.updateDeliveryInfo as jest.Mock).mockResolvedValue(mockUpdated);

      await service.setStatusToFetched(mockProposalId, dId, mockUser);

      expect(deliveryInfoService.setStatusToFetched).toHaveBeenCalledWith(mockInfo);
      expect(mockUpdated.save).toHaveBeenCalled();
    });
  });

  describe('researcherStartedAnalysis', () => {
    it('should iterate over all delivery infos and update state', async () => {
      const d1 = { _id: 'd1', status: DeliveryInfoStatus.RESULTS_AVAILABLE, subDeliveries: [] }; // Should conclude
      const d2 = { _id: 'd2', status: DeliveryInfoStatus.PENDING, subDeliveries: [] }; // Should cancel
      const d3 = { _id: 'd3', status: DeliveryInfoStatus.FETCHED_BY_RESEARCHER, subDeliveries: [] }; // Should be ignored

      const mockDoc = createMockProposal({ deliveryInfos: [d1, d2, d3] });
      (proposalCrudService.findDocument as jest.Mock).mockResolvedValue(mockDoc);
      (crudService.updateDeliveryInfo as jest.Mock).mockResolvedValue(mockDoc); // Return self for ease

      await service.researcherStartedAnalysis(mockProposalId, mockUser);

      // d1 -> Concluded
      expect(deliveryInfoService.setStatusToFetched).toHaveBeenCalledWith(d1);
      // d2 -> Cancelled
      expect(deliveryInfoService.setToCancelDelivery).toHaveBeenCalledWith(d2);

      expect(crudService.updateDeliveryInfo).toHaveBeenCalledTimes(3);
      expect(mockDoc.save).toHaveBeenCalled();
    });
  });
});
