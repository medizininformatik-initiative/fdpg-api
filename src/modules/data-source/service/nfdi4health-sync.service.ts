import { Injectable, Logger } from '@nestjs/common';
import { Nfdi4HealthService } from './nfdi4health.service';
import { DataSourceCrudService } from './data-source-crud.service';
import { Nfdi4HealthMapper } from '../utils/nfdi4health-mapper.util';

/**
 * Service responsible for synchronizing NFDI4Health data with local database.
 * Handles orchestration of data fetching, mapping, and persistence.
 */
@Injectable()
export class Nfdi4HealthSyncService {
  constructor(
    private readonly nfdi4HealthService: Nfdi4HealthService,
    private readonly dataSourceCrudService: DataSourceCrudService,
  ) {}

  private readonly logger = new Logger(Nfdi4HealthSyncService.name);

  /**
   * Synchronizes all data from NFDI4Health to local database.
   * - Creates new entries with PENDING status
   * - Updates existing entries while preserving DEACTIVATED status
   * - Returns statistics about the sync operation
   */
  async syncAllData(maxResults?: number): Promise<{
    fetched: number;
    created: number;
    updated: number;
    skipped: number;
    deactivatedPreserved: number;
    errors: number;
  }> {
    const startTime = Date.now();
    const stats = {
      fetched: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      deactivatedPreserved: 0,
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

            if (result.deactivatedPreserved) {
              stats.deactivatedPreserved++;
              this.logger.debug(`Updated ${nfdi4healthId} (preserved DEACTIVATED status)`);
            } else {
              this.logger.debug(`Updated ${nfdi4healthId}`);
            }
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
          `Updated: ${stats.updated}, Deactivated preserved: ${stats.deactivatedPreserved}, ` +
          `Errors: ${stats.errors}`,
      );

      return stats;
    } catch (error) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      this.logger.error(`Synchronization failed after ${duration}s: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Synchronizes a single study by its NFDI4Health identifier.
   * Useful for targeted updates.
   */
  async syncSingleStudy(nfdi4healthId: string): Promise<void> {
    this.logger.log(`Syncing single study: ${nfdi4healthId}`);

    try {
      // This would require a new method in Nfdi4HealthService to fetch a single study
      // For now, we'll fetch all and filter (not optimal but works)
      const allData = await this.nfdi4HealthService.getAll(1000);
      const study = allData.find((item) => item.resource.identifier === nfdi4healthId);

      if (!study) {
        this.logger.warn(`Study ${nfdi4healthId} not found in NFDI4Health`);
        return;
      }

      const existing = await this.dataSourceCrudService.findByNfdi4HealthId(nfdi4healthId);
      const mappedData = Nfdi4HealthMapper.mapToDataSource(study, existing?.status);

      const result = await this.dataSourceCrudService.upsertByNfdi4HealthId(nfdi4healthId, mappedData);

      if (result.created) {
        this.logger.log(`Created study ${nfdi4healthId}`);
      } else {
        this.logger.log(
          `Updated study ${nfdi4healthId}${result.deactivatedPreserved ? ' (preserved DEACTIVATED)' : ''}`,
        );
      }
    } catch (error) {
      this.logger.error(`Failed to sync study ${nfdi4healthId}: ${error.message}`, error.stack);
      throw error;
    }
  }
}
