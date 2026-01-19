import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSourceController } from '../controller/data-source.controller';
import { DataSourceService } from '../service/data-source.service';
import { DataSourceSyncCoordinatorService } from '../service/data-source-sync-coordinator.service';
import { DataSourceStatus, DataSourceSortField, SortOrder, DataSourceOrigin } from '../enum/data-source-status.enum';
import { DataSourceDto } from '../dto/data-source.dto';
import { Language } from 'src/shared/enums/language.enum';

describe('DataSourceController', () => {
  let controller: DataSourceController;
  let service: jest.Mocked<DataSourceService>;
  let syncCoordinator: jest.Mocked<DataSourceSyncCoordinatorService>;

  const mockDataSourceDto: DataSourceDto = {
    externalIdentifier: 'TEST-001',
    origin: DataSourceOrigin.NFDI4HEALTH,
    status: DataSourceStatus.APPROVED,
    titles: [{ language: Language.EN, value: 'Test Study' }],
    descriptions: [{ language: Language.EN, value: 'Test description' }],
    active: true,
  } as unknown as DataSourceDto;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DataSourceController],
      providers: [
        {
          provide: DataSourceService,
          useValue: {
            searchWithPagination: jest.fn(),
            getById: jest.fn(),
            getByExternalIdentifier: jest.fn(),
            updateStatus: jest.fn(),
            setActive: jest.fn(),
          },
        },
        {
          provide: DataSourceSyncCoordinatorService,
          useValue: {
            syncAll: jest.fn(),
            isAnySyncInProgress: jest.fn(),
            getSyncStatuses: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<DataSourceController>(DataSourceController);
    service = module.get(DataSourceService);
    syncCoordinator = module.get(DataSourceSyncCoordinatorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('search', () => {
    it('should search active approved data sources', async () => {
      const mockResult = {
        data: [mockDataSourceDto],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      };

      service.searchWithPagination.mockResolvedValue(mockResult);

      const result = await controller.search('test', 1, 20);

      expect(result).toEqual(mockResult);
      expect(service.searchWithPagination).toHaveBeenCalledWith(
        {
          query: 'test',
          status: DataSourceStatus.APPROVED,
          sortBy: undefined,
          sortOrder: undefined,
          language: undefined,
        },
        { page: 1, pageSize: 20 },
        true,
      );
    });

    it('should use default pagination values', async () => {
      service.searchWithPagination.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0,
      });

      await controller.search();

      expect(service.searchWithPagination).toHaveBeenCalledWith(
        expect.anything(),
        { page: 1, pageSize: 20 },
        expect.anything(),
      );
    });

    it('should convert string query params to numbers', async () => {
      service.searchWithPagination.mockResolvedValue({
        data: [],
        total: 0,
        page: 2,
        pageSize: 50,
        totalPages: 0,
      });

      await controller.search(undefined, '2' as any, '50' as any);

      expect(service.searchWithPagination).toHaveBeenCalledWith(expect.anything(), { page: 2, pageSize: 50 }, true);
    });

    it('should throw BadRequestException for invalid page number', async () => {
      await expect(controller.search(undefined, 0)).rejects.toThrow(BadRequestException);
      await expect(controller.search(undefined, 0)).rejects.toThrow('Page must be greater than 0');
    });

    it('should pass sort parameters', async () => {
      service.searchWithPagination.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0,
      });

      await controller.search('test', 1, 20, DataSourceSortField.TITLE, SortOrder.DESC, 'de');

      expect(service.searchWithPagination).toHaveBeenCalledWith(
        {
          query: 'test',
          status: DataSourceStatus.APPROVED,
          sortBy: DataSourceSortField.TITLE,
          sortOrder: SortOrder.DESC,
          language: 'de',
        },
        { page: 1, pageSize: 20 },
        true,
      );
    });
  });

  describe('searchInOverview', () => {
    it('should search data sources with status filter', async () => {
      const mockResult = {
        data: [mockDataSourceDto],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      };

      service.searchWithPagination.mockResolvedValue(mockResult);

      const result = await controller.searchInOverview('test', DataSourceStatus.PENDING, 1, 20);

      expect(result).toEqual(mockResult);
      expect(service.searchWithPagination).toHaveBeenCalledWith(
        {
          query: 'test',
          status: DataSourceStatus.PENDING,
          sortBy: undefined,
          sortOrder: undefined,
          language: undefined,
        },
        { page: 1, pageSize: 20 },
        false,
      );
    });

    it('should search all data sources without status filter', async () => {
      service.searchWithPagination.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0,
      });

      await controller.searchInOverview();

      expect(service.searchWithPagination).toHaveBeenCalledWith(
        {
          query: undefined,
          status: undefined,
          sortBy: undefined,
          sortOrder: undefined,
          language: undefined,
        },
        { page: 1, pageSize: 20 },
        false,
      );
    });

    it('should throw BadRequestException for invalid page number', async () => {
      await expect(controller.searchInOverview(undefined, undefined, -1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getById', () => {
    it('should return data source by ID', async () => {
      service.getById.mockResolvedValue(mockDataSourceDto);

      const result = await controller.getById('507f1f77bcf86cd799439011');

      expect(result).toEqual(mockDataSourceDto);
      expect(service.getById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
    });

    it('should throw NotFoundException when data source not found', async () => {
      service.getById.mockResolvedValue(null);

      await expect(controller.getById('507f1f77bcf86cd799439011')).rejects.toThrow(NotFoundException);
      await expect(controller.getById('507f1f77bcf86cd799439011')).rejects.toThrow(
        'Data source with ID 507f1f77bcf86cd799439011 not found',
      );
    });
  });

  describe('getByExternalIdentifier', () => {
    it('should return data source by external identifier', async () => {
      service.getByExternalIdentifier.mockResolvedValue(mockDataSourceDto);

      const result = await controller.getByExternalIdentifier('TEST-001');

      expect(result).toEqual(mockDataSourceDto);
      expect(service.getByExternalIdentifier).toHaveBeenCalledWith('TEST-001');
    });

    it('should throw NotFoundException when data source not found', async () => {
      service.getByExternalIdentifier.mockResolvedValue(null);

      await expect(controller.getByExternalIdentifier('NON-EXISTENT')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('should update data source status successfully', async () => {
      service.updateStatus.mockResolvedValue(true);

      await controller.updateStatus('TEST-001', DataSourceStatus.APPROVED);

      expect(service.updateStatus).toHaveBeenCalledWith('TEST-001', DataSourceStatus.APPROVED);
    });

    it('should throw NotFoundException when data source not found', async () => {
      service.updateStatus.mockResolvedValue(false);

      await expect(controller.updateStatus('NON-EXISTENT', DataSourceStatus.APPROVED)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('setActive', () => {
    it('should activate data source successfully', async () => {
      service.setActive.mockResolvedValue(true);

      await controller.setActive('TEST-001', true);

      expect(service.setActive).toHaveBeenCalledWith('TEST-001', true);
    });

    it('should deactivate data source successfully', async () => {
      service.setActive.mockResolvedValue(true);

      await controller.setActive('TEST-001', false);

      expect(service.setActive).toHaveBeenCalledWith('TEST-001', false);
    });

    it('should throw NotFoundException when data source not found', async () => {
      service.setActive.mockResolvedValue(false);

      await expect(controller.setActive('NON-EXISTENT', true)).rejects.toThrow(NotFoundException);
    });
  });

  describe('syncFromNfdi4Health', () => {
    it('should trigger sync in background', async () => {
      syncCoordinator.syncAll.mockResolvedValue({
        total: {
          fetched: 10,
          created: 5,
          updated: 3,
          skipped: 2,
          errors: 0,
        },
        byOrigin: {
          [DataSourceOrigin.NFDI4HEALTH]: {
            fetched: 10,
            created: 5,
            updated: 3,
            skipped: 2,
            errors: 0,
          },
        },
      });

      const result = await controller.syncFromNfdi4Health();

      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('startedAt');
      expect(result.message).toBe('Synchronization started in background for all sources');
      expect(result.startedAt).toBeInstanceOf(Date);
      expect(syncCoordinator.syncAll).toHaveBeenCalled();
    });

    it('should not throw error if sync fails in background', async () => {
      syncCoordinator.syncAll.mockRejectedValue(new Error('Sync failed'));

      // Should not throw - errors are caught in background
      const result = await controller.syncFromNfdi4Health();

      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('startedAt');
    });
  });

  describe('getSyncStatus', () => {
    it('should return sync status for all sources', async () => {
      const now = new Date();
      syncCoordinator.isAnySyncInProgress.mockReturnValue(true);
      syncCoordinator.getSyncStatuses.mockReturnValue([
        {
          origin: DataSourceOrigin.NFDI4HEALTH,
          isInProgress: true,
          startTime: now,
        },
      ]);

      const result = await controller.getSyncStatus();

      expect(result).toEqual({
        isAnyRunning: true,
        sources: [
          {
            origin: DataSourceOrigin.NFDI4HEALTH,
            isInProgress: true,
            startTime: now,
          },
        ],
      });
    });

    it('should return no sync in progress', async () => {
      syncCoordinator.isAnySyncInProgress.mockReturnValue(false);
      syncCoordinator.getSyncStatuses.mockReturnValue([
        {
          origin: DataSourceOrigin.NFDI4HEALTH,
          isInProgress: false,
          startTime: null,
        },
      ]);

      const result = await controller.getSyncStatus();

      expect(result.isAnyRunning).toBe(false);
      expect(result.sources[0].isInProgress).toBe(false);
      expect(result.sources[0].startTime).toBeNull();
    });
  });
});
