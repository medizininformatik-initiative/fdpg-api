import { Injectable, Logger } from '@nestjs/common';
import { Nfdi4HealthClient } from '../client/nfdi4health.client';
import { AxiosInstance } from 'axios';
import { Nfdi4HealthContentItemDto, Nfdi4HealthResponseDto } from '../dto/nfdi4health.dto';

@Injectable()
export class Nfdi4HealthService {
  constructor(private readonly nfdi4HealthClient: Nfdi4HealthClient) {
    this.apiClient = this.nfdi4HealthClient.client;
  }

  private readonly logger = new Logger(Nfdi4HealthService.name);

  private apiClient: AxiosInstance;

  private readonly baseFilter = {
    q: 'resource.design.dataSharingPlan.requestData:(https\\:\\/\\/antrag.forschen-fuer-gesundheit.de\\/*)',
    perPage: 10,
    showFacets: true,
    sortField: 'relevance',
    sortOrder: 'asc',
    start: 0,
  };

  /**
   * Fetches all studies from NFDI4Health with pagination support.
   * Automatically handles pagination by making multiple requests until all data is retrieved.
   *
   * @param perPage - Number of results per page (default: 100, max recommended: 1000)
   * @param maxResults - Optional maximum number of total results to fetch (useful for testing)
   * @returns Promise containing all study records
   */
  async getAll(perPage: number = 50, maxResults?: number): Promise<Nfdi4HealthContentItemDto[]> {
    const results: Nfdi4HealthContentItemDto[] = [];
    let currentPage = 0;
    let totalElements = 0;
    let hasMorePages = true;

    this.logger.log(
      `Starting NFDI4Health data fetch - perPage: ${perPage}${maxResults ? `, maxResults: ${maxResults}` : ''}`,
    );

    try {
      while (hasMorePages) {
        const start = currentPage * perPage;

        this.logger.debug(`Fetching page ${currentPage + 1} (start: ${start}, perPage: ${perPage})`);

        const params = {
          ...this.baseFilter,
          perPage,
          start,
        };

        const response = await this.apiClient.post<Nfdi4HealthResponseDto>('/api/resources/', params);

        const { content, totalElements: total } = response.data;

        // Set total on first request
        if (currentPage === 0) {
          totalElements = total;
          this.logger.log(
            `Total elements available: ${totalElements} (estimated pages: ${Math.ceil(totalElements / perPage)})`,
          );
        }

        // Add fetched results
        results.push(...content);

        this.logger.debug(
          `Page ${currentPage + 1} fetched: ${content.length} items (total collected: ${results.length}/${totalElements})`,
        );

        currentPage++;

        // Check if we should continue pagination
        const reachedEnd = results.length >= totalElements;
        const reachedMaxResults = maxResults && results.length >= maxResults;
        const noMoreContent = content.length === 0;

        if (reachedEnd || reachedMaxResults || noMoreContent) {
          hasMorePages = false;

          if (reachedMaxResults) {
            this.logger.log(`Stopping fetch: reached maxResults limit (${maxResults})`);
            // Trim results to maxResults
            results.splice(maxResults);
          } else if (noMoreContent) {
            this.logger.warn(
              `Stopping fetch: received empty page at ${currentPage} (expected ${totalElements - results.length} more items)`,
            );
          }
        }

        // Add a small delay to avoid overwhelming the API
        if (hasMorePages) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      this.logger.log(`Successfully fetched ${results.length} studies from NFDI4Health (${currentPage} pages`);

      return results;
    } catch (error) {
      this.logger.error(
        `Failed to fetch NFDI4Health data (page ${currentPage + 1}, ${results.length} items collected)`,
        error.stack,
      );
      throw error;
    }
  }
}
