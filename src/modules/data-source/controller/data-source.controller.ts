import { BadRequestException, Body, Get, HttpCode, NotFoundException, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ApiController } from 'src/shared/decorators/api-controller.decorator';
import { Auth } from 'src/shared/decorators/auth.decorator';
import { Role } from 'src/shared/enums/role.enum';
import { DataSourceService } from '../service/data-source.service';
import { Nfdi4HealthSyncService } from '../service/nfdi4health-sync.service';
import { DataSourceDto, DataSourcePaginatedResultDto } from '../dto/data-source.dto';
import { DataSourceStatus } from '../enum/data-source-status.enum';

/**
 * Controller for managing data sources from NFDI4Health.
 * Provides endpoints for searching, pagination, and status management.
 */
@ApiController('data-sources')
@ApiTags('data-sources')
export class DataSourceController {
  constructor(
    private readonly dataSourceService: DataSourceService,
    private readonly nfdi4HealthSyncService: Nfdi4HealthSyncService,
  ) {}

  /**
   * Search active data sources with pagination.
   * Searches in NFDI4Health identifier and titles (all languages).
   */
  @Get('search')
  @Auth(...Object.values(Role))
  @ApiOperation({
    summary: 'Search active data sources with pagination',
    description: 'Searches active data sources by NFDI4Health identifier or title. Supports pagination.',
  })
  @ApiOkResponse({
    description: 'Paginated search results',
    type: DataSourcePaginatedResultDto,
  })
  @ApiQuery({ name: 'query', required: false, description: 'Search query for identifier or title' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'pageSize', required: false, description: 'Page size (default: 20)' })
  async search(
    @Query('query') query?: string,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 20,
  ): Promise<DataSourcePaginatedResultDto> {
    if (page < 1) {
      throw new BadRequestException('Page must be greater than 0');
    }

    return this.dataSourceService.searchWithPagination(
      { query, status: DataSourceStatus.APPROVED },
      { page, pageSize },
      true,
    );
  }

  /**
   * Search  data sources with pagination.
   * Searches in NFDI4Health identifier and titles (all languages).
   */
  @Get('overview/search')
  @Auth(Role.FdpgMember)
  @ApiOperation({
    summary: 'Search data sources with pagination',
    description:
      'Searches data sources by NFDI4Health identifier or title. Supports optional status filtering and pagination.',
  })
  @ApiOkResponse({
    description: 'Paginated search results',
    type: DataSourcePaginatedResultDto,
  })
  @ApiQuery({ name: 'query', required: false, description: 'Search query for identifier or title' })
  @ApiQuery({ name: 'status', enum: DataSourceStatus, required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'pageSize', required: false, description: 'Page size (default: 20)' })
  async searchInOverview(
    @Query('query') query?: string,
    @Query('status') status?: DataSourceStatus,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 20,
  ): Promise<DataSourcePaginatedResultDto> {
    if (page < 1) {
      throw new BadRequestException('Page must be greater than 0');
    }

    return this.dataSourceService.searchWithPagination({ query, status }, { page, pageSize }, false);
  }

  /**
   * Get a single data source by ID.
   */
  @Get(':id')
  @Auth(...Object.values(Role))
  @ApiOperation({
    summary: 'Get data source by ID',
    description: 'Returns a single data source by MongoDB ID.',
  })
  @ApiOkResponse({ description: 'Data source details', type: DataSourceDto })
  @ApiNotFoundResponse({ description: 'Data source not found' })
  async getById(@Param('id') id: string): Promise<DataSourceDto> {
    const dataSource = await this.dataSourceService.getById(id);

    if (!dataSource) {
      throw new NotFoundException(`Data source with ID ${id} not found`);
    }

    return dataSource;
  }

  /**
   * Get a single data source by NFDI4Health identifier.
   */
  @Get('nfdi4health/:nfdi4healthId')
  @Auth(...Object.values(Role))
  @ApiOperation({
    summary: 'Get data source by NFDI4Health identifier',
    description: 'Returns a single data source by its NFDI4Health identifier (e.g., NCT number, DRKS ID).',
  })
  @ApiOkResponse({ description: 'Data source details', type: DataSourceDto })
  @ApiNotFoundResponse({ description: 'Data source not found' })
  async getByNfdi4HealthId(@Param('nfdi4healthId') nfdi4healthId: string): Promise<DataSourceDto> {
    const dataSource = await this.dataSourceService.getByNfdi4HealthId(nfdi4healthId);

    if (!dataSource) {
      throw new NotFoundException(`Data source with NFDI4Health ID ${nfdi4healthId} not found`);
    }

    return dataSource;
  }

  /**
   * Update the status of a data source.
   */
  @Patch(':nfdi4healthId/status')
  @Auth(Role.FdpgMember)
  @HttpCode(204)
  @ApiOperation({
    summary: 'Update data source status',
    description: 'Updates the approval status of a data source. Admin only.',
  })
  @ApiNotFoundResponse({ description: 'Data source not found' })
  async updateStatus(
    @Param('nfdi4healthId') nfdi4healthId: string,
    @Body('status') status: DataSourceStatus,
  ): Promise<void> {
    if (!Object.values(DataSourceStatus).includes(status)) {
      throw new BadRequestException('Invalid status value');
    }

    const updated = await this.dataSourceService.updateStatus(nfdi4healthId, status);

    if (!updated) {
      throw new NotFoundException(`Data source with NFDI4Health ID ${nfdi4healthId} not found`);
    }
  }

  // ====== Sync Endpoints ======

  /**
   * Trigger synchronization from NFDI4Health.
   */
  @Post('sync')
  @Auth(Role.FdpgMember)
  @ApiOperation({
    summary: 'Synchronize data from NFDI4Health',
    description:
      'Triggers a full synchronization of data sources from NFDI4Health. ' +
      'Creates new entries with PENDING status and updates existing ones while preserving DEACTIVATED status. ' +
      'Admin only.',
  })
  @ApiOkResponse({
    description: 'Synchronization statistics',
    schema: {
      type: 'object',
      properties: {
        fetched: { type: 'number', description: 'Number of studies fetched from NFDI4Health' },
        created: { type: 'number', description: 'Number of new data sources created' },
        updated: { type: 'number', description: 'Number of existing data sources updated' },
        skipped: { type: 'number', description: 'Number of studies skipped' },
        deactivatedPreserved: { type: 'number', description: 'Number of deactivated sources preserved' },
        errors: { type: 'number', description: 'Number of errors encountered' },
      },
    },
  })
  async syncFromNfdi4Health(): Promise<{
    fetched: number;
    created: number;
    updated: number;
    skipped: number;
    deactivatedPreserved: number;
    errors: number;
  }> {
    return this.nfdi4HealthSyncService.syncAllData();
  }

  /**
   * Get synchronization status.
   */
  @Get('sync/status')
  @Auth(Role.FdpgMember)
  @ApiOperation({
    summary: 'Get synchronization status',
    description: 'Returns the current status of the synchronization process.',
  })
  @ApiOkResponse({
    description: 'Synchronization status',
    schema: {
      type: 'object',
      properties: {
        isRunning: { type: 'boolean', description: 'Whether a sync is currently in progress' },
        startedAt: { type: 'string', format: 'date-time', description: 'When the sync started (null if not running)' },
      },
    },
  })
  async getSyncStatus(): Promise<{
    isRunning: boolean;
    startedAt: Date | null;
  }> {
    const isRunning = this.nfdi4HealthSyncService.isSyncInProgress();
    const startedAt = this.nfdi4HealthSyncService.getSyncStartTime();

    return {
      isRunning,
      startedAt,
    };
  }
}
