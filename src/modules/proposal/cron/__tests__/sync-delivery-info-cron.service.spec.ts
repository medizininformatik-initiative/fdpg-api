import { Test, TestingModule } from '@nestjs/testing';
import { SyncDeliveryInfoCronService } from '../sync-delivery-info-cron.service';
import { SchedulerService } from 'src/modules/scheduler/scheduler.service';
import { ProposalDataDeliverySyncService } from '../../services/data-delivery/proposal-data-delivery-sync.service';
import { ProposalDataDeliveryCrudService } from '../../services/data-delivery/proposal-data-delivery-crud.service';
import { ScheduleType } from 'src/modules/scheduler/enums/schedule-type.enum';
import { DeliveryInfoStatus } from '../../enums/delivery-info-status.enum';
import { Logger } from '@nestjs/common';

describe('SyncDeliveryInfoCronService', () => {
  let service: SyncDeliveryInfoCronService;
  let lockService: SchedulerService;
  let syncService: ProposalDataDeliverySyncService;
  let crudService: ProposalDataDeliveryCrudService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncDeliveryInfoCronService,
        {
          provide: SchedulerService,
          useValue: { acquireLock: jest.fn() },
        },
        {
          provide: ProposalDataDeliverySyncService,
          useValue: {
            syncSubDeliveryStatusesWithDsf: jest.fn(),
            syncDeliveryInfoResultWithDsf: jest.fn(),
          },
        },
        {
          provide: ProposalDataDeliveryCrudService,
          useValue: {
            getProposalsWithDeliveriesByStatus: jest.fn(),
            updateDeliveryInfo: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SyncDeliveryInfoCronService>(SyncDeliveryInfoCronService);
    lockService = module.get<SchedulerService>(SchedulerService);
    syncService = module.get<ProposalDataDeliverySyncService>(ProposalDataDeliverySyncService);
    crudService = module.get<ProposalDataDeliveryCrudService>(ProposalDataDeliveryCrudService);

    // Silence logger
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});

    jest.clearAllMocks();
  });

  describe('runDeliverySyncCron (Shared Logic)', () => {
    it('should not run logic if lock cannot be acquired', async () => {
      // Arrange
      (lockService.acquireLock as jest.Mock).mockResolvedValue(false);
      // We spy on the CRUD service to ensure it wasn't called, implying the callback wasn't run
      const spy = jest.spyOn(crudService, 'getProposalsWithDeliveriesByStatus');

      // Act
      await service.handleDailyDeliveryInfoUpdateSubDeliveriesSync();

      // Assert
      expect(lockService.acquireLock).toHaveBeenCalledWith(
        ScheduleType.DailySyncDeliveryInfosSetSubDeliveryStatus,
        300000, // 5 minutes
      );
      expect(spy).not.toHaveBeenCalled();
      expect(Logger.prototype.debug).toHaveBeenCalledWith(expect.stringContaining('Lock held by another instance'));
    });

    it('should run logic if lock is acquired', async () => {
      (lockService.acquireLock as jest.Mock).mockResolvedValue(true);
      (crudService.getProposalsWithDeliveriesByStatus as jest.Mock).mockResolvedValue([]); // Return empty to avoid inner logic errors

      await service.handleDailyDeliveryInfoUpdateSubDeliveriesSync();

      expect(crudService.getProposalsWithDeliveriesByStatus).toHaveBeenCalled();
    });

    it('should log error if the main cron logic fails unexpectedly', async () => {
      (lockService.acquireLock as jest.Mock).mockResolvedValue(true);
      (crudService.getProposalsWithDeliveriesByStatus as jest.Mock).mockRejectedValue(new Error('Fatal DB Error'));

      await service.handleDailyDeliveryInfoUpdateSubDeliveriesSync();

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        expect.stringContaining('CRON job'),
        expect.any(String), // Stack trace
      );
    });
  });

  describe('handleDailyDeliveryInfoUpdateSubDeliveriesSync', () => {
    const jobType = ScheduleType.DailySyncDeliveryInfosSetSubDeliveryStatus;

    it('should process only valid PENDING deliveries', async () => {
      // Arrange
      (lockService.acquireLock as jest.Mock).mockResolvedValue(true);

      const mockDelivery1 = { _id: 'd1', status: DeliveryInfoStatus.PENDING, manualEntry: false };
      const mockDelivery2 = { _id: 'd2', status: DeliveryInfoStatus.FETCHED_BY_RESEARCHER, manualEntry: false }; // Wrong Status
      const mockDelivery3 = { _id: 'd3', status: DeliveryInfoStatus.PENDING, manualEntry: true }; // Manual entry

      const mockProposals = [
        { _id: 'p1', dataDelivery: { deliveryInfos: [mockDelivery1, mockDelivery2, mockDelivery3] } },
      ];

      (crudService.getProposalsWithDeliveriesByStatus as jest.Mock).mockResolvedValue(mockProposals);

      // Act
      await service.handleDailyDeliveryInfoUpdateSubDeliveriesSync();

      // Assert
      expect(crudService.getProposalsWithDeliveriesByStatus).toHaveBeenCalledWith(DeliveryInfoStatus.PENDING);

      // Should call sync for d1 ONLY
      expect(syncService.syncSubDeliveryStatusesWithDsf).toHaveBeenCalledTimes(1);
      expect(syncService.syncSubDeliveryStatusesWithDsf).toHaveBeenCalledWith('p1', mockDelivery1);

      // Should call update for d1 ONLY
      expect(crudService.updateDeliveryInfo).toHaveBeenCalledTimes(1);
      expect(crudService.updateDeliveryInfo).toHaveBeenCalledWith('p1', mockDelivery1);
    });

    it('should handle errors for individual deliveries without stopping others', async () => {
      // Arrange
      (lockService.acquireLock as jest.Mock).mockResolvedValue(true);

      const d1 = { _id: 'd1', status: DeliveryInfoStatus.PENDING, manualEntry: false };
      const d2 = { _id: 'd2', status: DeliveryInfoStatus.PENDING, manualEntry: false };

      const mockProposals = [{ _id: 'p1', dataDelivery: { deliveryInfos: [d1, d2] } }];
      (crudService.getProposalsWithDeliveriesByStatus as jest.Mock).mockResolvedValue(mockProposals);

      // Fail the first one, succeed the second
      (syncService.syncSubDeliveryStatusesWithDsf as jest.Mock)
        .mockRejectedValueOnce(new Error('Sync failed'))
        .mockResolvedValueOnce(undefined);

      // Act
      await service.handleDailyDeliveryInfoUpdateSubDeliveriesSync();

      // Assert
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        expect.stringContaining(`could not sync proposalId p1 deliveryInfoId d1`),
        expect.any(String),
      );

      // Check summary log
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        expect.stringContaining(`Completed CRON job: ${jobType}. Successful: 1. Failed: 1.`),
      );

      // Verify second one succeeded
      expect(crudService.updateDeliveryInfo).toHaveBeenCalledWith('p1', d2);
    });
  });

  describe('handleDailyDeliveryInfoFetchResultsSync', () => {
    const jobType = ScheduleType.DailySyncDeliveryInfosFetchResult;

    it('should process deliveries waiting for data set', async () => {
      // Arrange
      (lockService.acquireLock as jest.Mock).mockResolvedValue(true);

      const mockDelivery = { _id: 'd1', status: DeliveryInfoStatus.WAITING_FOR_DATA_SET, manualEntry: false };
      const mockProposals = [{ _id: 'p1', dataDelivery: { deliveryInfos: [mockDelivery] } }];

      (crudService.getProposalsWithDeliveriesByStatus as jest.Mock).mockResolvedValue(mockProposals);

      // Act
      await service.handleDailyDeliveryInfoFetchResultsSync();

      // Assert
      expect(crudService.getProposalsWithDeliveriesByStatus).toHaveBeenCalledWith(
        DeliveryInfoStatus.WAITING_FOR_DATA_SET,
      );

      expect(syncService.syncDeliveryInfoResultWithDsf).toHaveBeenCalledWith('p1', mockDelivery);
      expect(crudService.updateDeliveryInfo).toHaveBeenCalledWith('p1', mockDelivery);
    });

    it('should skip manual entries', async () => {
      // Arrange
      (lockService.acquireLock as jest.Mock).mockResolvedValue(true);
      const manualDelivery = { _id: 'd1', manualEntry: true };
      const mockProposals = [{ _id: 'p1', dataDelivery: { deliveryInfos: [manualDelivery] } }];
      (crudService.getProposalsWithDeliveriesByStatus as jest.Mock).mockResolvedValue(mockProposals);

      // Act
      await service.handleDailyDeliveryInfoFetchResultsSync();

      // Assert
      expect(syncService.syncDeliveryInfoResultWithDsf).not.toHaveBeenCalled();
    });
  });
});
