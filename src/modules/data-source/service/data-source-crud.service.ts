import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DataSource, DataSourceDocument } from '../schema/data-source.schema';
import { DataSourceStatus, DataSourceSortField, SortOrder } from '../enum/data-source-status.enum';
import { Language } from 'src/shared/enums/language.enum';

@Injectable()
export class DataSourceCrudService {
  constructor(
    @InjectModel(DataSource.name)
    private readonly dataSourceModel: Model<DataSourceDocument>,
  ) {}

  private readonly logger = new Logger(DataSourceCrudService.name);

  /**
   * Finds a data source by its external identifier.
   */
  async findByExternalIdentifier(externalIdentifier: string): Promise<DataSourceDocument | null> {
    return await this.dataSourceModel.findOne({ externalIdentifier }).exec();
  }

  /**
   * Finds a data source by its MongoDB _id.
   */
  async findById(id: string): Promise<DataSourceDocument | null> {
    return await this.dataSourceModel.findById(id).exec();
  }

  /**
   * Finds all data sources with optional filters.
   */
  async findAll(filter: Partial<DataSource> = {}): Promise<DataSourceDocument[]> {
    return await this.dataSourceModel.find(filter).exec();
  }

  /**
   * Finds data sources by status.
   */
  async findByStatus(status: DataSourceStatus): Promise<DataSourceDocument[]> {
    return await this.dataSourceModel.find({ status }).exec();
  }

  /**
   * Creates a new data source.
   */
  async create(dataSource: Partial<DataSource>): Promise<DataSourceDocument> {
    return await this.dataSourceModel.create(dataSource);
  }

  /**
   * Updates a data source by its external identifier.
   * Returns true if the document was found and updated.
   */
  async updateByExternalIdentifier(externalIdentifier: string, update: Partial<DataSource>): Promise<boolean> {
    const result = await this.dataSourceModel.updateOne({ externalIdentifier }, { $set: update }).exec();
    return result.matchedCount > 0;
  }

  /**
   * Upserts a data source (update if exists, create if not).
   * When updating an existing data source, preserves the status and active flag.
   */
  async upsertByExternalIdentifier(
    externalIdentifier: string,
    dataSource: Partial<DataSource>,
  ): Promise<{ created: boolean }> {
    const existing = await this.findByExternalIdentifier(externalIdentifier);

    if (existing) {
      // Preserve status and active flag from existing record
      const updateData = { ...dataSource };
      delete updateData.status;
      delete updateData.active;

      await this.updateByExternalIdentifier(externalIdentifier, updateData);

      return {
        created: false,
      };
    } else {
      await this.create({ ...dataSource, externalIdentifier });
      return { created: true };
    }
  }

  /**
   * Updates the status of a data source.
   */
  async updateStatus(externalIdentifier: string, status: DataSourceStatus): Promise<boolean> {
    const update: Partial<DataSource> = { status };

    // Set approval date and active flag when status is changed to APPROVED
    if (status === DataSourceStatus.APPROVED) {
      update.approvalDate = new Date();
      update.active = true;
    }

    return await this.updateByExternalIdentifier(externalIdentifier, update);
  }

  /**
   * Updates the active flag of a data source.
   */
  async updateActive(externalIdentifier: string, active: boolean): Promise<boolean> {
    return await this.updateByExternalIdentifier(externalIdentifier, { active });
  }

  /**
   * Searches data sources by query text and optional status with pagination.
   * Searches in:
   * - externalIdentifier (case-insensitive partial match)
   * - titles.value (case-insensitive partial match in any language)
   *
   * @param onlyActive - If true, only returns active and approved data sources
   * @param query - Search text for identifier or title (optional)
   * @param status - Optional status filter
   * @param skip - Number of documents to skip for pagination (optional)
   * @param limit - Maximum number of documents to return (optional)
   * @param sortBy - Field to sort by (optional, defaults to TITLE)
   * @param sortOrder - Sort order ASC or DESC (optional, defaults to ASC)
   * @param language - Preferred language for title sorting (optional, defaults to EN)
   * @returns Object with data array and total count
   */
  async searchByQueryAndStatus(
    onlyActive: boolean,
    query?: string,
    status?: DataSourceStatus,
    skip?: number,
    limit?: number,
    sortBy?: DataSourceSortField,
    sortOrder?: SortOrder,
    language?: Language,
  ): Promise<{ data: DataSourceDocument[]; total: number }> {
    const filter: any = {};

    if (onlyActive) {
      filter.status = DataSourceStatus.APPROVED;
      filter.active = true;
    }

    // Add status filter if provided
    if (status && !onlyActive) {
      filter.status = status;
    }

    // Add text search filter if query provided
    if (query && query.trim()) {
      const searchRegex = new RegExp(query.trim(), 'i'); // Case-insensitive
      filter.$or = [{ externalIdentifier: searchRegex }, { 'titles.value': searchRegex }];
    }

    // Build sort object
    const sort: any = {};
    const sortField = sortBy || DataSourceSortField.TITLE;
    const order = sortOrder === SortOrder.DESC ? -1 : 1;
    const preferredLanguage = language || Language.EN;

    switch (sortField) {
      case DataSourceSortField.TITLE:
        // For title sorting, we need to fetch all and sort in application layer
        // to properly handle language preference with fallback
        break;
      case DataSourceSortField.EXTERNAL_IDENTIFIER:
        sort.externalIdentifier = order;
        break;
      case DataSourceSortField.STATUS:
        sort.status = order;
        break;
      case DataSourceSortField.CREATED_AT:
        sort.createdAt = order;
        break;
      case DataSourceSortField.UPDATED_AT:
        sort.updatedAt = order;
        break;
      default:
        // Default to no DB sort, will be handled in app layer
        break;
    }

    // For title sorting, we need to handle it differently
    const shouldSortByTitleInApp = sortField === DataSourceSortField.TITLE;

    if (shouldSortByTitleInApp) {
      // Get total count
      const total = await this.dataSourceModel.countDocuments(filter).exec();

      // Fetch all matching documents (we'll sort and paginate in memory)
      // This is necessary for proper language-based sorting
      const allData = await this.dataSourceModel.find(filter).exec();

      // Sort by title with language preference
      const sortedData = allData.sort((a, b) => {
        const titleA = this.getTitleByLanguage(a.titles, preferredLanguage);
        const titleB = this.getTitleByLanguage(b.titles, preferredLanguage);
        const comparison = titleA.localeCompare(titleB, 'en', { sensitivity: 'base' });
        return order === 1 ? comparison : -comparison;
      });

      // Apply pagination
      const start = skip || 0;
      const end = limit ? start + limit : sortedData.length;
      const paginatedData = sortedData.slice(start, end);

      return { data: paginatedData, total };
    } else {
      // Build query with DB-level sorting
      let dataQuery = this.dataSourceModel.find(filter).sort(sort);

      // Apply pagination if provided
      if (skip !== undefined) {
        dataQuery = dataQuery.skip(skip);
      }
      if (limit !== undefined) {
        dataQuery = dataQuery.limit(limit);
      }

      // Execute query and count in parallel
      const [data, total] = await Promise.all([dataQuery.exec(), this.dataSourceModel.countDocuments(filter).exec()]);

      return { data, total };
    }
  }

  /**
   * Gets title in preferred language with fallback logic:
   * 1. Preferred language
   * 2. English (EN)
   * 3. First available title
   */
  private getTitleByLanguage(
    titles: Array<{ language: Language; value: string }>,
    preferredLanguage: Language,
  ): string {
    // Try preferred language
    const preferredTitle = titles.find((t) => t.language === preferredLanguage);
    if (preferredTitle) return preferredTitle.value;

    // Fallback to English
    const enTitle = titles.find((t) => t.language === Language.EN);
    if (enTitle) return enTitle.value;

    // Fallback to first available
    return titles[0]?.value || '';
  }
}
