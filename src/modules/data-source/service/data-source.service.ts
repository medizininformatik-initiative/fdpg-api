import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { DataSourceCrudService } from './data-source-crud.service';
import { DataSourceStatus } from '../enum/data-source-status.enum';
import {
  DataSourceDto,
  DataSourcePaginatedResultDto,
  DataSourcePaginationParamsDto,
  DataSourceSearchParamsDto,
} from '../dto/data-source.dto';
import { DataSourceDocument } from '../schema/data-source.schema';

@Injectable()
export class DataSourceService {
  constructor(private readonly dataSourceCrudService: DataSourceCrudService) {}

  private mapToDto(document: DataSourceDocument): DataSourceDto {
    return plainToInstance(DataSourceDto, document.toObject(), {
      excludeExtraneousValues: true,
    });
  }

  private mapToDtos(documents: DataSourceDocument[]): DataSourceDto[] {
    return documents.map((doc) => this.mapToDto(doc));
  }

  /**
   * Searches data sources by NFDI4Health identifier or title with pagination.
   * Supports optional status filtering and sorting.
   *
   * @param searchParams - Search query, status filter, sort parameters, and language preference
   * @param paginationParams - Page number and page size
   * @param onlyActive - If true, only searches active data sources
   * @returns Paginated search results with metadata
   */
  async searchWithPagination(
    searchParams: DataSourceSearchParamsDto,
    paginationParams: DataSourcePaginationParamsDto,
    onlyActive: boolean,
  ): Promise<DataSourcePaginatedResultDto> {
    const { query, status, sortBy, sortOrder, language } = searchParams;
    const { page, pageSize } = paginationParams;

    const skip = (page - 1) * pageSize;

    const result = await this.dataSourceCrudService.searchByQueryAndStatus(
      onlyActive,
      query,
      status,
      skip,
      pageSize,
      sortBy,
      sortOrder,
      language,
    );

    const totalPages = Math.ceil(result.total / pageSize);

    return {
      data: this.mapToDtos(result.data),
      total: result.total,
      page,
      pageSize,
      totalPages,
    };
  }

  /**
   * Gets paginated list of data sources with optional status filter.
   *
   * @param status - Optional status filter
   * @param paginationParams - Page number and page size
   * @returns Paginated results with metadata
   */
  async getPaginated(
    status: DataSourceStatus | undefined,
    paginationParams: DataSourcePaginationParamsDto,
    onlyActive: boolean,
  ): Promise<DataSourcePaginatedResultDto> {
    return await this.searchWithPagination({ status }, paginationParams, onlyActive);
  }

  async getByNfdi4HealthId(nfdi4healthId: string): Promise<DataSourceDto | null> {
    const document = await this.dataSourceCrudService.findByNfdi4HealthId(nfdi4healthId);
    return document ? this.mapToDto(document) : null;
  }

  async getById(id: string): Promise<DataSourceDto | null> {
    const document = await this.dataSourceCrudService.findById(id);
    return document ? this.mapToDto(document) : null;
  }

  async updateStatus(nfdi4healthId: string, status: DataSourceStatus): Promise<boolean> {
    return await this.dataSourceCrudService.updateStatus(nfdi4healthId, status);
  }

  /**
   * Activates or deactivates a data source.
   */
  async setActive(nfdi4healthId: string, active: boolean): Promise<boolean> {
    return await this.dataSourceCrudService.updateActive(nfdi4healthId, active);
  }
}
