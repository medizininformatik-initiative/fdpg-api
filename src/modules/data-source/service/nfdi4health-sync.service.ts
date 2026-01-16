import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { Nfdi4HealthService } from './nfdi4health.service';
import { DataSourceCrudService } from './data-source-crud.service';
import { Nfdi4HealthMapper } from '../utils/nfdi4health-mapper.util';

/**
 * Service responsible for synchronizing NFDI4Health data with local database.
 * Handles orchestration of data fetching, mapping, and persistence.
 * Implements locking mechanism to prevent concurrent sync operations.
 */
@Injectable()
export class Nfdi4HealthSyncService {
  constructor(
    private readonly nfdi4HealthService: Nfdi4HealthService,
    private readonly dataSourceCrudService: DataSourceCrudService,
  ) {}

  private readonly logger = new Logger(Nfdi4HealthSyncService.name);

  /**
   * Lock flag to prevent concurrent sync operations.
   * Only one sync can run at a time per application instance.
   */
  private isSyncRunning = false;

  /**
   * Timestamp of when the current sync started.
   */
  private syncStartedAt: Date | null = null;

  /**
   * Checks if a sync operation is currently running.
   * @returns True if sync is running, false otherwise
   */
  isSyncInProgress(): boolean {
    return this.isSyncRunning;
  }

  /**
   * Gets the timestamp when the current sync started.
   * @returns Date when sync started or null if no sync is running
   */
  getSyncStartTime(): Date | null {
    return this.syncStartedAt;
  }

  /**
   * Synchronizes all data from NFDI4Health to database.
   * - Creates new entries with PENDING status
   * - Updates existing entries
   * - Returns statistics about the sync operation
   * - Throws ConflictException if sync is already running
   */
  async syncAllData(maxResults?: number): Promise<{
    fetched: number;
    created: number;
    updated: number;
    skipped: number;
    errors: number;
  }> {
    // Check if sync is already running
    if (this.isSyncRunning) {
      const runningDuration = this.syncStartedAt
        ? `Started ${Math.round((Date.now() - this.syncStartedAt.getTime()) / 1000)}s ago`
        : 'Running';

      this.logger.warn('Sync already in progress, rejecting new sync request');
      throw new ConflictException(
        `Synchronization is already in progress. ${runningDuration}. Please wait for it to complete.`,
      );
    }

    // Acquire lock
    this.isSyncRunning = true;
    this.syncStartedAt = new Date();

    const startTime = Date.now();
    const stats = {
      fetched: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
    };

    this.logger.log('Starting NFDI4Health data synchronization...');

    try {
      // Fetch all data from NFDI4Health
      const allData = await this.nfdi4HealthService.getAll(100, maxResults);
      stats.fetched = allData.length;

      this.logger.log(`Processing ${allData.length} studies from NFDI4Health`);

      // Process each item
      for (const item of allData) {
        try {
          const nfdi4healthId = item.resource.identifier;

          // Check if entry already exists
          const existing = await this.dataSourceCrudService.findByNfdi4HealthId(nfdi4healthId);

          // Map the data using the mapper util
          const mappedData = Nfdi4HealthMapper.mapToDataSource(item, existing?.status);

          // Upsert using DataSourceService
          const result = await this.dataSourceCrudService.upsertByNfdi4HealthId(nfdi4healthId, mappedData);

          if (result.created) {
            stats.created++;
            this.logger.debug(`Created ${nfdi4healthId} (status: PENDING)`);
          } else {
            stats.updated++;

            this.logger.debug(`Updated ${nfdi4healthId}`);
          }
        } catch (error) {
          stats.errors++;
          this.logger.error(`Failed to process study ${item.resource.identifier}: ${error.message}`, error.stack);
        }
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      this.logger.log(
        `Synchronization completed in ${duration}s - ` +
          `Fetched: ${stats.fetched}, Created: ${stats.created}, ` +
          `Updated: ${stats.updated}` +
          `Errors: ${stats.errors}`,
      );

      return stats;
    } catch (error) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      this.logger.error(`Synchronization failed after ${duration}s: ${error.message}`, error.stack);
      throw error;
    } finally {
      // Always release lock, even if sync failed
      this.isSyncRunning = false;
      this.syncStartedAt = null;
      this.logger.debug('Sync lock released');
    }
  }
}
