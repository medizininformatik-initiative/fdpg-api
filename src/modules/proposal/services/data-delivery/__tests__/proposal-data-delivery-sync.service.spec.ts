import { Test, TestingModule } from '@nestjs/testing';
import { ProposalDataDeliverySyncService } from '../proposal-data-delivery-sync.service';
import { LocationService } from 'src/modules/location/service/location.service';
import { FhirService } from 'src/modules/fhir/fhir.service';
import { Logger, NotFoundException } from '@nestjs/common';
import { DeliveryInfoStatus } from '../../../enums/delivery-info-status.enum';
import { SubDeliveryStatus } from '../../../enums/data-delivery.enum';

describe('ProposalDataDeliverySyncService', () => {
  let service: ProposalDataDeliverySyncService;
  let locationService: LocationService;
  let fhirService: FhirService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProposalDataDeliverySyncService,
        {
          provide: LocationService,
          useValue: {
            findAllLookUpMap: jest.fn(),
          },
        },
        {
          provide: FhirService,
          useValue: {
            pollForReceivedDataSetsByBusinessKey: jest.fn(),
            fetchResultUrl: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProposalDataDeliverySyncService>(ProposalDataDeliverySyncService);
    locationService = module.get<LocationService>(LocationService);
    fhirService = module.get<FhirService>(FhirService);

    // Silence Logger
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});

    jest.clearAllMocks();
  });

  describe('syncSubDeliveryStatusesWithDsf', () => {
    const validStatus = DeliveryInfoStatus.PENDING;
    const proposalId = 'prop-1';

    it('should throw Error if delivery status is invalid', async () => {
      const invalidDelivery = {
        _id: 'd1',
        status: DeliveryInfoStatus.FETCHED_BY_RESEARCHER, // Invalid for this operation
      } as any;

      await expect(service.syncSubDeliveryStatusesWithDsf(proposalId, invalidDelivery)).rejects.toThrow(
        "is not in a 'PENDING' state",
      );
    });

    it('should throw NotFoundException if fhirBusinessKey is missing', async () => {
      const deliveryWithoutKey = {
        _id: 'd1',
        status: validStatus,
        fhirBusinessKey: null,
      } as any;

      await expect(service.syncSubDeliveryStatusesWithDsf(proposalId, deliveryWithoutKey)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should update sub-delivery statuses based on FHIR response', async () => {
      // Arrange
      const mockDeliveryInfo = {
        _id: 'd1',
        status: validStatus,
        fhirBusinessKey: 'BK-123',
        createdAt: new Date('2023-01-01'),
        subDeliveries: [
          { location: 'loc-1', status: SubDeliveryStatus.PENDING }, // Should become DELIVERED
          { location: 'loc-2', status: SubDeliveryStatus.PENDING }, // Should stay PENDING (not in fhir)
          { location: 'loc-3', status: SubDeliveryStatus.ACCEPTED }, // Should stay ACCEPTED (even if in fhir)
        ],
      } as any;

      const mockLookUpMap = {
        'loc-1': { uri: 'http://dic-1.com' },
        'loc-2': { uri: 'http://dic-2.com' },
        'loc-3': { uri: 'http://dic-3.com' },
      };

      const mockFhirResponse = [
        { 'dic-identifier-value': 'http://dic-1.com' }, // Matches loc-1
        { 'dic-identifier-value': 'http://dic-3.com' }, // Matches loc-3
      ];

      (locationService.findAllLookUpMap as jest.Mock).mockResolvedValue(mockLookUpMap);
      (fhirService.pollForReceivedDataSetsByBusinessKey as jest.Mock).mockResolvedValue(mockFhirResponse);

      // Act
      await service.syncSubDeliveryStatusesWithDsf(proposalId, mockDeliveryInfo);

      // Assert
      expect(locationService.findAllLookUpMap).toHaveBeenCalled();
      expect(fhirService.pollForReceivedDataSetsByBusinessKey).toHaveBeenCalledWith(
        'BK-123',
        expect.any(Date), // Should use createdAt since lastSynced was undefined
      );

      // Check SubDelivery 1 (Updated)
      expect(mockDeliveryInfo.subDeliveries[0].status).toBe(SubDeliveryStatus.DELIVERED);

      // Check SubDelivery 2 (Unchanged)
      expect(mockDeliveryInfo.subDeliveries[1].status).toBe(SubDeliveryStatus.PENDING);

      // Check SubDelivery 3 (Protected state)
      expect(mockDeliveryInfo.subDeliveries[2].status).toBe(SubDeliveryStatus.ACCEPTED);

      // Check metadata update
      expect(mockDeliveryInfo.lastSynced).toBeInstanceOf(Date);
    });

    it('should use lastSynced date if available for polling', async () => {
      const lastSyncedDate = new Date('2023-06-01');
      const mockDeliveryInfo = {
        _id: 'd1',
        status: validStatus,
        fhirBusinessKey: 'BK-123',
        lastSynced: lastSyncedDate,
        subDeliveries: [],
      } as any;

      (locationService.findAllLookUpMap as jest.Mock).mockResolvedValue({});
      (fhirService.pollForReceivedDataSetsByBusinessKey as jest.Mock).mockResolvedValue([]);

      await service.syncSubDeliveryStatusesWithDsf(proposalId, mockDeliveryInfo);

      expect(fhirService.pollForReceivedDataSetsByBusinessKey).toHaveBeenCalledWith('BK-123', lastSyncedDate);
    });
  });

  describe('syncDeliveryInfoResultWithDsf', () => {
    const validStatus = DeliveryInfoStatus.WAITING_FOR_DATA_SET;
    const proposalId = 'prop-1';

    it('should throw Error if status is invalid', async () => {
      const invalidDelivery = {
        _id: 'd1',
        status: DeliveryInfoStatus.PENDING,
      } as any;

      await expect(service.syncDeliveryInfoResultWithDsf(proposalId, invalidDelivery)).rejects.toThrow(
        "is not in a 'WAITING_FOR_DATA_SET' state",
      );
    });

    it('should throw NotFoundException if fhirBusinessKey is missing', async () => {
      const invalidDelivery = {
        _id: 'd1',
        status: validStatus,
        fhirBusinessKey: null,
      } as any;

      await expect(service.syncDeliveryInfoResultWithDsf(proposalId, invalidDelivery)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if fhirTaskId is missing', async () => {
      const invalidDelivery = {
        _id: 'd1',
        status: validStatus,
        fhirBusinessKey: 'BK',
        fhirTaskId: null,
      } as any;

      await expect(service.syncDeliveryInfoResultWithDsf(proposalId, invalidDelivery)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should update status and resultUrl if result is found', async () => {
      const mockDeliveryInfo = {
        _id: 'd1',
        status: validStatus,
        fhirBusinessKey: 'BK',
        fhirTaskId: 'TASK-1',
      } as any;

      const mockResultUrl = 'http://results.com/data.zip';
      (fhirService.fetchResultUrl as jest.Mock).mockResolvedValue(mockResultUrl);

      await service.syncDeliveryInfoResultWithDsf(proposalId, mockDeliveryInfo);

      expect(fhirService.fetchResultUrl).toHaveBeenCalledWith('TASK-1');
      expect(mockDeliveryInfo.status).toBe(DeliveryInfoStatus.RESULTS_AVAILABLE);
      expect(mockDeliveryInfo.resultUrl).toBe(mockResultUrl);
      expect(mockDeliveryInfo.lastSynced).toBeInstanceOf(Date);
    });

    it('should ONLY update lastSynced if result is NOT found', async () => {
      const mockDeliveryInfo = {
        _id: 'd1',
        status: validStatus,
        fhirBusinessKey: 'BK',
        fhirTaskId: 'TASK-1',
      } as any;

      (fhirService.fetchResultUrl as jest.Mock).mockResolvedValue(null);

      await service.syncDeliveryInfoResultWithDsf(proposalId, mockDeliveryInfo);

      expect(fhirService.fetchResultUrl).toHaveBeenCalledWith('TASK-1');
      // Status remains unchanged
      expect(mockDeliveryInfo.status).toBe(validStatus);
      expect(mockDeliveryInfo.resultUrl).toBeUndefined();
      // But timestamp is updated
      expect(mockDeliveryInfo.lastSynced).toBeInstanceOf(Date);
    });
  });
});
