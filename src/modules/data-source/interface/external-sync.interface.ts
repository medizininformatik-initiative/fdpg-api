import { DataSourceOrigin } from '../enum/data-source-status.enum';

/**
 * Statistics returned from a sync operation
 */
export interface ISyncStats {
  fetched: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
}

/**
 * Interface that all external data source sync services must implement.
 * Provides a standardized contract for synchronizing data from external sources.
 */
export interface IExternalSyncService {
  /**
   * Gets the origin identifier for this sync service
   */
  getOrigin(): DataSourceOrigin;

  /**
   * Synchronizes data from the external source to the local database
   * @param maxResults - Optional limit on number of items to fetch
   * @returns Statistics about the sync operation
   */
  syncData(maxResults?: number): Promise<ISyncStats>;

  /**
   * Checks if a sync operation is currently running for this service
   * @returns True if sync is in progress, false otherwise
   */
  isSyncInProgress(): boolean;

  /**
   * Gets the timestamp when the current sync started
   * @returns Date when sync started or null if no sync is running
   */
  getSyncStartTime(): Date | null;
}
