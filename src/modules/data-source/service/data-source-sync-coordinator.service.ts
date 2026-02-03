import { Injectable, Logger } from '@nestjs/common';
import { IExternalSyncService, ISyncStats } from '../interface/external-sync.interface';
import { DataSourceOrigin } from '../enum/data-source-status.enum';
import { Nfdi4HealthSyncService } from './nfdi4health-sync.service';

/**
 * Coordinator service that manages all external data source sync services.
 * Provides a facade for synchronizing data from multiple external sources.
 * Allows iteration through all registered sync service implementations.
 */
@Injectable()
export class DataSourceSyncCoordinatorService {
  private readonly logger = new Logger(DataSourceSyncCoordinatorService.name);
  private readonly syncServices: IExternalSyncService[] = [];

  constructor(private readonly nfdi4HealthSyncService: Nfdi4HealthSyncService) {
    // register all sync services
    this.syncServices.push(this.nfdi4HealthSyncService);

    this.logger.log(
      `Initialized with ${this.syncServices.length} sync service(s): ${this.syncServices.map((s) => s.getOrigin()).join(', ')}`,
    );
  }

  /**
   * Get a specific sync service by origin.
   * @param origin The data source origin
   * @returns The sync service for that origin or undefined if not found
   */
  getSyncService(origin: DataSourceOrigin): IExternalSyncService | undefined {
    return this.syncServices.find((service) => service.getOrigin() === origin);
  }

  /**
   * Get all registered sync services.
   * @returns Array of all sync service implementations
   */
  getAllSyncServices(): IExternalSyncService[] {
    return this.syncServices;
  }

  /**
   * Check if any sync is currently in progress.
   * @returns true if any sync service is currently running
   */
  isAnySyncInProgress(): boolean {
    return this.syncServices.some((service) => service.isSyncInProgress());
  }

  /**
   * Get sync status for all services.
   * @returns Array of objects with origin and sync status
   */
  getSyncStatuses(): Array<{
    origin: DataSourceOrigin;
    isInProgress: boolean;
    startTime: Date | null;
  }> {
    return this.syncServices.map((service) => ({
      origin: service.getOrigin(),
      isInProgress: service.isSyncInProgress(),
      startTime: service.getSyncStartTime(),
    }));
  }

  /**
   * Synchronize data from a specific external source.
   * @param origin The data source origin to sync
   * @param maxResults Optional maximum number of results to fetch
   * @returns Sync statistics for the specified origin
   * @throws Error if the sync service for the specified origin is not found
   */
  async syncByOrigin(origin: DataSourceOrigin, maxResults?: number): Promise<ISyncStats> {
    const service = this.getSyncService(origin);

    if (!service) {
      throw new Error(`No sync service found for origin: ${origin}`);
    }

    this.logger.log(`Starting sync for origin: ${origin}`);
    const stats = await service.syncData(maxResults);
    this.logger.log(`Completed sync for origin: ${origin}`, stats);

    return stats;
  }

  /**
   * Synchronize data from all registered external sources.
   * Executes syncs sequentially to avoid overwhelming the system.
   * @param maxResults Optional maximum number of results to fetch per source
   * @returns Aggregated sync statistics from all sources
   */
  async syncAll(maxResults?: number): Promise<{
    total: ISyncStats;
    byOrigin: Record<DataSourceOrigin, ISyncStats>;
  }> {
    this.logger.log(`Starting synchronization for all ${this.syncServices.length} source(s)`);

    const byOrigin: Record<string, ISyncStats> = {};
    const total: ISyncStats = {
      fetched: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
    };

    // Execute syncs sequentially
    for (const service of this.syncServices) {
      const origin = service.getOrigin();

      try {
        this.logger.log(`Syncing from ${origin}...`);
        const stats = await service.syncData(maxResults);

        byOrigin[origin] = stats;

        // Aggregate totals
        total.fetched += stats.fetched;
        total.created += stats.created;
        total.updated += stats.updated;
        total.skipped += stats.skipped;
        total.errors += stats.errors;

        this.logger.log(`Completed sync from ${origin}`, stats);
      } catch (error) {
        this.logger.error(`Failed to sync from ${origin}: ${error.message}`, error.stack);

        // Track the error in stats
        byOrigin[origin] = {
          fetched: 0,
          created: 0,
          updated: 0,
          skipped: 0,
          errors: 1,
        };
        total.errors++;
      }
    }

    this.logger.log('All synchronizations completed', { total, byOrigin });

    return { total, byOrigin: byOrigin as Record<DataSourceOrigin, ISyncStats> };
  }
}
