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
   * Preserves DEACTIVATED status if the document already exists.
   */
  async upsertByNfdi4HealthId(
    nfdi4healthId: string,
    dataSource: Partial<DataSource>,
  ): Promise<{ created: boolean; deactivatedPreserved: boolean }> {
    const existing = await this.findByNfdi4HealthId(nfdi4healthId);

    if (existing) {
      // Preserve DEACTIVATED status
      const updateData = { ...dataSource };
      if (existing.status === DataSourceStatus.DEACTIVATED) {
        updateData.status = DataSourceStatus.DEACTIVATED;
      }

      await this.updateByNfdi4HealthId(nfdi4healthId, updateData);

      return {
        created: false,
        deactivatedPreserved: existing.status === DataSourceStatus.DEACTIVATED,
      };
    } else {
      await this.create({ ...dataSource, nfdi4healthId });
      return { created: true, deactivatedPreserved: false };
    }
  }

  /**
   * Updates the status of a data source.
   */
  async updateStatus(nfdi4healthId: string, status: DataSourceStatus): Promise<boolean> {
    const update: Partial<DataSource> = { status };

    // Set approval date when status is changed to APPROVED
    if (status === DataSourceStatus.APPROVED) {
      update.approvalDate = new Date();
    }

    return await this.updateByNfdi4HealthId(nfdi4healthId, update);
  }
}
