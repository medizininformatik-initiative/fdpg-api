import { DataSourceSyncCoordinatorService } from '../service/data-source-sync-coordinator.service';
import { IExternalSyncService, ISyncStats } from '../interface/external-sync.interface';
import { DataSourceOrigin } from '../enum/data-source-status.enum';

describe('DataSourceSyncCoordinatorService', () => {
  let coordinatorService: DataSourceSyncCoordinatorService;
  let mockNfdi4HealthService: jest.Mocked<IExternalSyncService>;
  let mockOtherService: jest.Mocked<IExternalSyncService>;

  const createMockSyncService = (origin: DataSourceOrigin): jest.Mocked<IExternalSyncService> => ({
    getOrigin: jest.fn().mockReturnValue(origin),
    syncData: jest.fn(),
    isSyncInProgress: jest.fn().mockReturnValue(false),
    getSyncStartTime: jest.fn().mockReturnValue(null),
  });

  beforeEach(async () => {
    mockNfdi4HealthService = createMockSyncService(DataSourceOrigin.NFDI4HEALTH);
    mockOtherService = createMockSyncService('OTHER_SOURCE' as DataSourceOrigin);

    // Create coordinator with only NFDI4Health service (matches actual implementation)
    coordinatorService = new DataSourceSyncCoordinatorService(mockNfdi4HealthService as any);

    // Manually add other service for testing purposes
    (coordinatorService as any).syncServices.push(mockOtherService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with all provided sync services', () => {
      const services = coordinatorService.getAllSyncServices();
      expect(services).toHaveLength(2);
      expect(services).toContain(mockNfdi4HealthService);
      expect(services).toContain(mockOtherService);
    });
  });

  describe('getSyncService', () => {
    it('should return sync service by origin', () => {
      const service = coordinatorService.getSyncService(DataSourceOrigin.NFDI4HEALTH);
      expect(service).toBe(mockNfdi4HealthService);
    });

    it('should return undefined for non-existent origin', () => {
      const service = coordinatorService.getSyncService('NON_EXISTENT' as DataSourceOrigin);
      expect(service).toBeUndefined();
    });
  });

  describe('getAllSyncServices', () => {
    it('should return all registered sync services', () => {
      const services = coordinatorService.getAllSyncServices();
      expect(services).toHaveLength(2);
      expect(services).toEqual([mockNfdi4HealthService, mockOtherService]);
    });
  });

  describe('isAnySyncInProgress', () => {
    it('should return false when no sync is in progress', () => {
      mockNfdi4HealthService.isSyncInProgress.mockReturnValue(false);
      mockOtherService.isSyncInProgress.mockReturnValue(false);

      expect(coordinatorService.isAnySyncInProgress()).toBe(false);
    });

    it('should return true when any sync is in progress', () => {
      mockNfdi4HealthService.isSyncInProgress.mockReturnValue(true);
      mockOtherService.isSyncInProgress.mockReturnValue(false);

      expect(coordinatorService.isAnySyncInProgress()).toBe(true);
    });

    it('should return true when multiple syncs are in progress', () => {
      mockNfdi4HealthService.isSyncInProgress.mockReturnValue(true);
      mockOtherService.isSyncInProgress.mockReturnValue(true);

      expect(coordinatorService.isAnySyncInProgress()).toBe(true);
    });
  });

  describe('getSyncStatuses', () => {
    it('should return status for all sync services', () => {
      const now = new Date();
      mockNfdi4HealthService.isSyncInProgress.mockReturnValue(true);
      mockNfdi4HealthService.getSyncStartTime.mockReturnValue(now);
      mockOtherService.isSyncInProgress.mockReturnValue(false);
      mockOtherService.getSyncStartTime.mockReturnValue(null);

      const statuses = coordinatorService.getSyncStatuses();

      expect(statuses).toHaveLength(2);
      expect(statuses[0]).toEqual({
        origin: DataSourceOrigin.NFDI4HEALTH,
        isInProgress: true,
        startTime: now,
      });
      expect(statuses[1]).toEqual({
        origin: 'OTHER_SOURCE',
        isInProgress: false,
        startTime: null,
      });
    });
  });

  describe('syncByOrigin', () => {
    it('should sync data from specific origin', async () => {
      const mockStats: ISyncStats = {
        fetched: 10,
        created: 5,
        updated: 3,
        skipped: 2,
        errors: 0,
      };
      mockNfdi4HealthService.syncData.mockResolvedValue(mockStats);

      const result = await coordinatorService.syncByOrigin(DataSourceOrigin.NFDI4HEALTH, 100);

      expect(result).toEqual(mockStats);
      expect(mockNfdi4HealthService.syncData).toHaveBeenCalledWith(100);
      expect(mockOtherService.syncData).not.toHaveBeenCalled();
    });

    it('should pass maxResults parameter to sync service', async () => {
      const mockStats: ISyncStats = {
        fetched: 50,
        created: 25,
        updated: 20,
        skipped: 5,
        errors: 0,
      };
      mockNfdi4HealthService.syncData.mockResolvedValue(mockStats);

      await coordinatorService.syncByOrigin(DataSourceOrigin.NFDI4HEALTH, 50);

      expect(mockNfdi4HealthService.syncData).toHaveBeenCalledWith(50);
    });

    it('should throw error for non-existent origin', async () => {
      await expect(coordinatorService.syncByOrigin('NON_EXISTENT' as DataSourceOrigin)).rejects.toThrow(
        'No sync service found for origin: NON_EXISTENT',
      );
    });

    it('should propagate errors from sync service', async () => {
      mockNfdi4HealthService.syncData.mockRejectedValue(new Error('Sync failed'));

      await expect(coordinatorService.syncByOrigin(DataSourceOrigin.NFDI4HEALTH)).rejects.toThrow('Sync failed');
    });
  });

  describe('syncAll', () => {
    it('should sync all sources sequentially', async () => {
      const nfdiStats: ISyncStats = {
        fetched: 10,
        created: 5,
        updated: 3,
        skipped: 2,
        errors: 0,
      };
      const otherStats: ISyncStats = {
        fetched: 20,
        created: 10,
        updated: 5,
        skipped: 3,
        errors: 2,
      };

      mockNfdi4HealthService.syncData.mockResolvedValue(nfdiStats);
      mockOtherService.syncData.mockResolvedValue(otherStats);

      const result = await coordinatorService.syncAll(100);

      expect(result.total).toEqual({
        fetched: 30,
        created: 15,
        updated: 8,
        skipped: 5,
        errors: 2,
      });
      expect(result.byOrigin[DataSourceOrigin.NFDI4HEALTH]).toEqual(nfdiStats);
      expect(result.byOrigin['OTHER_SOURCE']).toEqual(otherStats);

      expect(mockNfdi4HealthService.syncData).toHaveBeenCalledWith(100);
      expect(mockOtherService.syncData).toHaveBeenCalledWith(100);
    });

    it('should continue syncing other sources if one fails', async () => {
      const successStats: ISyncStats = {
        fetched: 20,
        created: 10,
        updated: 5,
        skipped: 3,
        errors: 2,
      };

      mockNfdi4HealthService.syncData.mockRejectedValue(new Error('NFDI sync failed'));
      mockOtherService.syncData.mockResolvedValue(successStats);

      const result = await coordinatorService.syncAll();

      expect(result.total.errors).toBe(3); // 1 from failed service + 2 from successful
      expect(result.byOrigin[DataSourceOrigin.NFDI4HEALTH]).toEqual({
        fetched: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        errors: 1,
      });
      expect(result.byOrigin['OTHER_SOURCE']).toEqual(successStats);

      expect(mockNfdi4HealthService.syncData).toHaveBeenCalled();
      expect(mockOtherService.syncData).toHaveBeenCalled();
    });

    it('should work with no registered sync services', async () => {
      // Create a mock service that won't be used
      const mockService = { getOrigin: () => 'MOCK' };
      const emptyCoordinator = new DataSourceSyncCoordinatorService(mockService as any);
      // Clear the auto-added service to simulate empty state
      (emptyCoordinator as any).syncServices = [];

      const result = await emptyCoordinator.syncAll();

      expect(result.total).toEqual({
        fetched: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        errors: 0,
      });
      expect(result.byOrigin).toEqual({});
    });

    it('should pass maxResults to all sync services', async () => {
      mockNfdi4HealthService.syncData.mockResolvedValue({
        fetched: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        errors: 0,
      });
      mockOtherService.syncData.mockResolvedValue({
        fetched: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        errors: 0,
      });

      await coordinatorService.syncAll(50);

      expect(mockNfdi4HealthService.syncData).toHaveBeenCalledWith(50);
      expect(mockOtherService.syncData).toHaveBeenCalledWith(50);
    });

    it('should aggregate all stats correctly', async () => {
      mockNfdi4HealthService.syncData.mockResolvedValue({
        fetched: 100,
        created: 50,
        updated: 30,
        skipped: 15,
        errors: 5,
      });
      mockOtherService.syncData.mockResolvedValue({
        fetched: 200,
        created: 100,
        updated: 60,
        skipped: 30,
        errors: 10,
      });

      const result = await coordinatorService.syncAll();

      expect(result.total.fetched).toBe(300);
      expect(result.total.created).toBe(150);
      expect(result.total.updated).toBe(90);
      expect(result.total.skipped).toBe(45);
      expect(result.total.errors).toBe(15);
    });
  });
});
