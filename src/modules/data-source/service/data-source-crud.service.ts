import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DataSource, DataSourceDocument } from '../schema/data-source.schema';
import { DataSourceStatus } from '../enum/data-source-status.enum';

@Injectable()
export class DataSourceCrudService {
  constructor(
    @InjectModel(DataSource.name)
    private readonly dataSourceModel: Model<DataSourceDocument>,
  ) {}

  private readonly logger = new Logger(DataSourceCrudService.name);

  /**
   * Finds a data source by its NFDI4Health identifier.
   */
  async findByNfdi4HealthId(nfdi4healthId: string): Promise<DataSourceDocument | null> {
    return await this.dataSourceModel.findOne({ nfdi4healthId }).exec();
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
   * Updates a data source by its NFDI4Health identifier.
   * Returns true if the document was found and updated.
   */
  async updateByNfdi4HealthId(nfdi4healthId: string, update: Partial<DataSource>): Promise<boolean> {
    const result = await this.dataSourceModel.updateOne({ nfdi4healthId }, { $set: update }).exec();
    return result.matchedCount > 0;
  }

  /**
   * Upserts a data source (update if exists, create if not).
   */
  async upsertByNfdi4HealthId(nfdi4healthId: string, dataSource: Partial<DataSource>): Promise<{ created: boolean }> {
    const existing = await this.findByNfdi4HealthId(nfdi4healthId);

    if (existing) {
      // Preserve active flag
      const updateData = { ...dataSource };

      await this.updateByNfdi4HealthId(nfdi4healthId, updateData);

      return {
        created: false,
      };
    } else {
      await this.create({ ...dataSource, nfdi4healthId });
      return { created: true };
    }
  }

  /**
   * Updates the status of a data source.
   */
  async updateStatus(nfdi4healthId: string, status: DataSourceStatus): Promise<boolean> {
    const update: Partial<DataSource> = { status };

    // Set approval date and active flag when status is changed to APPROVED
    if (status === DataSourceStatus.APPROVED) {
      update.approvalDate = new Date();
      update.active = true;
    }

    return await this.updateByNfdi4HealthId(nfdi4healthId, update);
  }

  /**
   * Updates the active flag of a data source.
   */
  async updateActive(nfdi4healthId: string, active: boolean): Promise<boolean> {
    return await this.updateByNfdi4HealthId(nfdi4healthId, { active });
  }

  /**
   * Searches data sources by query text and optional status with pagination.
   * Searches in:
   * - nfdi4healthId (case-insensitive partial match)
   * - titles.value (case-insensitive partial match in any language)
   *
   * @param query - Search text for identifier or title (optional)
   * @param status - Optional status filter
   * @param skip - Number of documents to skip for pagination (optional)
   * @param limit - Maximum number of documents to return (optional)
   * @returns Object with data array and total count
   */
  async searchByQueryAndStatus(
    onlyActive: boolean,
    query?: string,
    status?: DataSourceStatus,
    skip?: number,
    limit?: number,
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
      filter.$or = [{ nfdi4healthId: searchRegex }, { 'titles.value': searchRegex }];
    }

    // Build query
    let dataQuery = this.dataSourceModel.find(filter);

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
