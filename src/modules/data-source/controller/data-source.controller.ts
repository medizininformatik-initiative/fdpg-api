import { BadRequestException, Body, Get, HttpCode, NotFoundException, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ApiController } from 'src/shared/decorators/api-controller.decorator';
import { Auth } from 'src/shared/decorators/auth.decorator';
import { Role } from 'src/shared/enums/role.enum';
import { DataSourceService } from '../service/data-source.service';
import { DataSourceSyncCoordinatorService } from '../service/data-source-sync-coordinator.service';
import { DataSourceDto, DataSourcePaginatedResultDto } from '../dto/data-source.dto';
import { DataSourceStatus, DataSourceSortField, SortOrder } from '../enum/data-source-status.enum';

/**
 * Controller for managing data sources from external sources.
 * Provides endpoints for searching, pagination, and status management.
 */
@ApiController('data-sources')
export class DataSourceController {
  constructor(
    private readonly dataSourceService: DataSourceService,
    private readonly syncCoordinator: DataSourceSyncCoordinatorService,
  ) {}

  /**
   * Search active data sources with pagination.
   * Searches in NFDI4Health identifier and titles (all languages).
   */
  @Get('search')
  @Auth(...Object.values(Role))
  @ApiOperation({
    summary: 'Search active data sources with pagination',
    description: 'Searches active data sources by NFDI4Health identifier or title. Supports pagination and sorting.',
  })
  @ApiOkResponse({
    description: 'Paginated search results',
    type: DataSourcePaginatedResultDto,
  })
  @ApiQuery({ name: 'query', required: false, description: 'Search query for identifier or title' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'pageSize', required: false, description: 'Page size (default: 20)' })
  @ApiQuery({ name: 'sortBy', enum: DataSourceSortField, required: false, description: 'Sort field (default: TITLE)' })
  @ApiQuery({ name: 'sortOrder', enum: SortOrder, required: false, description: 'Sort order (default: ASC)' })
  @ApiQuery({
    name: 'language',
    enum: ['EN', 'DE'],
    required: false,
    description: 'Preferred language for title display (default: EN)',
  })
  async search(
    @Query('query') query?: string,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 20,
    @Query('sortBy') sortBy?: DataSourceSortField,
    @Query('sortOrder') sortOrder?: SortOrder,
    @Query('language') language?: string,
  ): Promise<DataSourcePaginatedResultDto> {
    // Convert to numbers (query params are strings by default)
    const numPage = Number(page);
    const numPageSize = Number(pageSize);

    if (numPage < 1) {
      throw new BadRequestException('Page must be greater than 0');
    }

    return this.dataSourceService.searchWithPagination(
      { query, status: DataSourceStatus.APPROVED, sortBy, sortOrder, language: language as any },
      { page: numPage, pageSize: numPageSize },
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
      'Searches data sources by NFDI4Health identifier or title. Supports optional status filtering, pagination, and sorting.',
  })
  @ApiOkResponse({
    description: 'Paginated search results',
    type: DataSourcePaginatedResultDto,
  })
  @ApiQuery({ name: 'query', required: false, description: 'Search query for identifier or title' })
  @ApiQuery({ name: 'status', enum: DataSourceStatus, required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'pageSize', required: false, description: 'Page size (default: 20)' })
  @ApiQuery({ name: 'sortBy', enum: DataSourceSortField, required: false, description: 'Sort field (default: TITLE)' })
  @ApiQuery({ name: 'sortOrder', enum: SortOrder, required: false, description: 'Sort order (default: ASC)' })
  @ApiQuery({
    name: 'language',
    enum: ['EN', 'DE'],
    required: false,
    description: 'Preferred language for title display (default: EN)',
  })
  async searchInOverview(
    @Query('query') query?: string,
    @Query('status') status?: DataSourceStatus,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 20,
    @Query('sortBy') sortBy?: DataSourceSortField,
    @Query('sortOrder') sortOrder?: SortOrder,
    @Query('language') language?: string,
  ): Promise<DataSourcePaginatedResultDto> {
    // Convert to numbers (query params are strings by default)
    const numPage = Number(page);
    const numPageSize = Number(pageSize);

    if (numPage < 1) {
      throw new BadRequestException('Page must be greater than 0');
    }

    return this.dataSourceService.searchWithPagination(
      { query, status, sortBy, sortOrder, language: language as any },
      { page: numPage, pageSize: numPageSize },
      false,
    );
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
   * Get a single data source by external identifier.
   */
  @Get('external/:externalIdentifier')
  @Auth(...Object.values(Role))
  @ApiOperation({
    summary: 'Get data source by external identifier',
    description: 'Returns a single data source by its external identifier (e.g., NCT number, DRKS ID).',
  })
  @ApiOkResponse({ description: 'Data source details', type: DataSourceDto })
  @ApiNotFoundResponse({ description: 'Data source not found' })
  async getByExternalIdentifier(@Param('externalIdentifier') externalIdentifier: string): Promise<DataSourceDto> {
    const dataSource = await this.dataSourceService.getByExternalIdentifier(externalIdentifier);

    if (!dataSource) {
      throw new NotFoundException(`Data source with external ID ${externalIdentifier} not found`);
    }

    return dataSource;
  }

  /**
   * Update the status of a data source.
   */
  @Patch(':externalIdentifier/status')
  @Auth(Role.FdpgMember)
  @HttpCode(204)
  @ApiOperation({
    summary: 'Update data source status',
    description: 'Updates the approval status of a data source. Admin only.',
  })
  @ApiNotFoundResponse({ description: 'Data source not found' })
  async updateStatus(
    @Param('externalIdentifier') externalIdentifier: string,
    @Body('status') status: DataSourceStatus,
  ): Promise<void> {
    if (!Object.values(DataSourceStatus).includes(status)) {
      throw new BadRequestException('Invalid status value');
    }

    const updated = await this.dataSourceService.updateStatus(externalIdentifier, status);

    if (!updated) {
      throw new NotFoundException(`Data source with external ID ${externalIdentifier} not found`);
    }
  }

  /**
   * Activate or deactivate a data source.
   */
  @Patch(':externalIdentifier/active')
  @Auth(Role.FdpgMember)
  @HttpCode(204)
  @ApiOperation({
    summary: 'Activate or deactivate a data source',
    description: 'Sets the active flag of a data source.',
  })
  @ApiNotFoundResponse({ description: 'Data source not found' })
  async setActive(
    @Param('externalIdentifier') externalIdentifier: string,
    @Body('active') active: boolean,
  ): Promise<void> {
    const updated = await this.dataSourceService.setActive(externalIdentifier, active);

    if (!updated) {
      throw new NotFoundException(`Data source with external ID ${externalIdentifier} not found`);
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
      'Triggers a full synchronization of data sources from NFDI4Health in the background. Returns immediately.',
  })
  @ApiOkResponse({
    description: 'Sync started successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Confirmation message' },
        startedAt: { type: 'string', format: 'date-time', description: 'When the sync started' },
      },
    },
  })
  async syncFromNfdi4Health(): Promise<{
    message: string;
    startedAt: Date;
  }> {
    // Trigger sync in background (fire-and-forget) to prevent an unresponsive backend
    this.syncCoordinator.syncAll().catch(() => {
      // Error is already logged in the service, just ensure it doesn't crash
    });

    return {
      message: 'Synchronization started in background for all sources',
      startedAt: new Date(),
    };
  }

  /**
   * Get synchronization status.
   */
  @Get('sync/status')
  @Auth(Role.FdpgMember)
  @ApiOperation({
    summary: 'Get synchronization status',
    description: 'Returns the current status of the synchronization process for all sources.',
  })
  @ApiOkResponse({
    description: 'Synchronization status for all sources',
    schema: {
      type: 'object',
      properties: {
        isAnyRunning: { type: 'boolean', description: 'Whether any sync is currently in progress' },
        sources: {
          type: 'array',
          description: 'Status for each registered sync source',
          items: {
            type: 'object',
            properties: {
              origin: { type: 'string', description: 'Data source origin' },
              isInProgress: { type: 'boolean', description: 'Whether this source is currently syncing' },
              startTime: {
                type: 'string',
                format: 'date-time',
                nullable: true,
                description: 'When the sync started for this source',
              },
            },
          },
        },
      },
    },
  })
  async getSyncStatus(): Promise<{
    isAnyRunning: boolean;
    sources: Array<{ origin: string; isInProgress: boolean; startTime: Date | null }>;
  }> {
    return {
      isAnyRunning: this.syncCoordinator.isAnySyncInProgress(),
      sources: this.syncCoordinator.getSyncStatuses(),
    };
  }
}
