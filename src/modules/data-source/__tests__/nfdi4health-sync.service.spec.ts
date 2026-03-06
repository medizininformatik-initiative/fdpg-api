import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { Nfdi4HealthSyncService } from '../service/nfdi4health-sync.service';
import { Nfdi4HealthService } from '../service/nfdi4health.service';
import { DataSourceCrudService } from '../service/data-source-crud.service';
import { DataSourceOrigin, DataSourceStatus } from '../enum/data-source-status.enum';

describe('Nfdi4HealthSyncService', () => {
  let service: Nfdi4HealthSyncService;
  let nfdi4HealthService: jest.Mocked<Nfdi4HealthService>;
  let dataSourceCrudService: jest.Mocked<DataSourceCrudService>;

  const mockNfdi4HealthData = [
    {
      resource: {
        identifier: 'NFDI-001',
        titles: [{ language: 'en', text: 'Test Study 1' }],
        descriptions: [{ language: 'en', text: 'Test description 1' }],
        classification: { type: 'Study' },
      },
      collections: [{ id: 1, name: 'Test Collection', alias: null }],
    },
    {
      resource: {
        identifier: 'NFDI-002',
        titles: [{ language: 'en', text: 'Test Study 2' }],
        descriptions: [{ language: 'en', text: 'Test description 2' }],
        classification: { type: 'Study' },
      },
      collections: [{ id: 1, name: 'Test Collection', alias: null }],
    },
  ] as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Nfdi4HealthSyncService,
        {
          provide: Nfdi4HealthService,
          useValue: {
            getAll: jest.fn(),
          },
        },
        {
          provide: DataSourceCrudService,
          useValue: {
            findByExternalIdentifier: jest.fn(),
            upsertByExternalIdentifier: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<Nfdi4HealthSyncService>(Nfdi4HealthSyncService);
    nfdi4HealthService = module.get(Nfdi4HealthService);
    dataSourceCrudService = module.get(DataSourceCrudService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getOrigin', () => {
    it('should return NFDI4HEALTH origin', () => {
      expect(service.getOrigin()).toBe(DataSourceOrigin.NFDI4HEALTH);
    });
  });

  describe('isSyncInProgress', () => {
    it('should return false initially', () => {
      expect(service.isSyncInProgress()).toBe(false);
    });

    it('should return true during sync', async () => {
      nfdi4HealthService.getAll.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve([]), 100);
          }),
      );

      const syncPromise = service.syncData();

      // Check during sync
      expect(service.isSyncInProgress()).toBe(true);

      await syncPromise;

      // Check after sync
      expect(service.isSyncInProgress()).toBe(false);
    });
  });

  describe('getSyncStartTime', () => {
    it('should return null initially', () => {
      expect(service.getSyncStartTime()).toBeNull();
    });

    it('should return start time during sync', async () => {
      nfdi4HealthService.getAll.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve([]), 100);
          }),
      );

      const syncPromise = service.syncData();

      const startTime = service.getSyncStartTime();
      expect(startTime).toBeInstanceOf(Date);

      await syncPromise;

      expect(service.getSyncStartTime()).toBeNull();
    });
  });

  describe('syncData', () => {
    it('should successfully sync new data sources', async () => {
      nfdi4HealthService.getAll.mockResolvedValue(mockNfdi4HealthData);
      dataSourceCrudService.findByExternalIdentifier.mockResolvedValue(null);
      dataSourceCrudService.upsertByExternalIdentifier.mockResolvedValue({
        created: true,
      });

      const stats = await service.syncData();

      expect(stats).toEqual({
        fetched: 2,
        created: 2,
        updated: 0,
        skipped: 0,
        errors: 0,
      });

      expect(nfdi4HealthService.getAll).toHaveBeenCalledWith(20, undefined);
      expect(dataSourceCrudService.findByExternalIdentifier).toHaveBeenCalledTimes(2);
      expect(dataSourceCrudService.upsertByExternalIdentifier).toHaveBeenCalledTimes(2);
    });

    it('should update existing data sources', async () => {
      nfdi4HealthService.getAll.mockResolvedValue(mockNfdi4HealthData);
      dataSourceCrudService.findByExternalIdentifier.mockResolvedValue({
        externalIdentifier: 'NFDI-001',
        status: DataSourceStatus.APPROVED,
      } as any);
      dataSourceCrudService.upsertByExternalIdentifier.mockResolvedValue({
        created: false,
      });

      const stats = await service.syncData();

      expect(stats).toEqual({
        fetched: 2,
        created: 0,
        updated: 2,
        skipped: 0,
        errors: 0,
      });
    });

    it('should handle errors for individual items', async () => {
      const dataWithError = [
        mockNfdi4HealthData[0],
        {
          resource: {
            identifier: 'NFDI-ERROR',
            // Missing required fields to cause an error
          },
        },
      ];

      nfdi4HealthService.getAll.mockResolvedValue(dataWithError as any);
      dataSourceCrudService.findByExternalIdentifier.mockResolvedValue(null);
      dataSourceCrudService.upsertByExternalIdentifier
        .mockResolvedValueOnce({
          created: true,
        })
        .mockRejectedValueOnce(new Error('Mapping error'));

      const stats = await service.syncData();

      expect(stats.fetched).toBe(2);
      expect(stats.created).toBe(1);
      expect(stats.errors).toBe(1);
    });

    it('should respect maxResults parameter', async () => {
      nfdi4HealthService.getAll.mockResolvedValue([]);

      await service.syncData(50);

      expect(nfdi4HealthService.getAll).toHaveBeenCalledWith(20, 50);
    });

    it('should throw ConflictException if sync already running', async () => {
      nfdi4HealthService.getAll.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve([]), 100);
          }),
      );

      const firstSync = service.syncData();

      await expect(service.syncData()).rejects.toThrow(ConflictException);
      await expect(service.syncData()).rejects.toThrow('Synchronization is already in progress');

      await firstSync;
    });

    it('should release lock after sync completes', async () => {
      nfdi4HealthService.getAll.mockResolvedValue([]);

      expect(service.isSyncInProgress()).toBe(false);

      await service.syncData();

      expect(service.isSyncInProgress()).toBe(false);
      expect(service.getSyncStartTime()).toBeNull();
    });

    it('should release lock even if sync fails', async () => {
      nfdi4HealthService.getAll.mockRejectedValue(new Error('Network error'));

      expect(service.isSyncInProgress()).toBe(false);

      await expect(service.syncData()).rejects.toThrow('Network error');

      expect(service.isSyncInProgress()).toBe(false);
      expect(service.getSyncStartTime()).toBeNull();
    });

    it('should create data sources with PENDING status', async () => {
      nfdi4HealthService.getAll.mockResolvedValue([mockNfdi4HealthData[0]]);
      dataSourceCrudService.findByExternalIdentifier.mockResolvedValue(null);
      dataSourceCrudService.upsertByExternalIdentifier.mockResolvedValue({
        created: true,
      });

      await service.syncData();

      const upsertCall = dataSourceCrudService.upsertByExternalIdentifier.mock.calls[0];
      expect(upsertCall[1].status).toBe(DataSourceStatus.PENDING);
    });

    it('should preserve existing status when updating', async () => {
      nfdi4HealthService.getAll.mockResolvedValue([mockNfdi4HealthData[0]]);
      dataSourceCrudService.findByExternalIdentifier.mockResolvedValue({
        externalIdentifier: 'NFDI-001',
        status: DataSourceStatus.APPROVED,
      } as any);
      dataSourceCrudService.upsertByExternalIdentifier.mockResolvedValue({
        created: false,
      });

      await service.syncData();

      const upsertCall = dataSourceCrudService.upsertByExternalIdentifier.mock.calls[0];
      expect(upsertCall[1].status).toBe(DataSourceStatus.APPROVED);
    });
  });
});
