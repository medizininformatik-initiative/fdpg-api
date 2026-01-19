import { describeWithMongo, MongoTestContext } from 'src/test/mongo-test.helper';
import { DataSourceCrudService } from '../service/data-source-crud.service';
import { Model } from 'mongoose';
import { DataSource, DataSourceSchema } from '../schema/data-source.schema';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { DataSourceStatus, DataSourceOrigin, DataSourceSortField, SortOrder } from '../enum/data-source-status.enum';
import { Language } from 'src/shared/enums/language.enum';

describeWithMongo(
  'DataSourceCrudServiceIT',
  [MongooseModule.forFeature([{ name: DataSource.name, schema: DataSourceSchema }]), DataSourceCrudService],
  (getContext) => {
    let context: MongoTestContext;
    let dataSourceCrudService: DataSourceCrudService;
    let dataSourceModel: Model<DataSource>;

    beforeEach(async () => {
      context = getContext();
      dataSourceCrudService = context.app.get<DataSourceCrudService>(DataSourceCrudService);
      dataSourceModel = context.app.get<Model<DataSource>>(getModelToken(DataSource.name));

      // Clear all data before each test
      await dataSourceModel.deleteMany({});
    });

    describe('findByExternalIdentifier', () => {
      it('should find data source by external identifier', async () => {
        await dataSourceModel.create({
          externalIdentifier: 'TEST-001',
          origin: DataSourceOrigin.NFDI4HEALTH,
          status: DataSourceStatus.PENDING,
          titles: [{ language: Language.EN, value: 'Test Data Source' }],
          descriptions: [{ language: Language.EN, value: 'Test description' }],
          classification: 'Study',
          collectionId: 1,
          collection: 'Test Collection',
          active: false,
        });

        const result = await dataSourceCrudService.findByExternalIdentifier('TEST-001');

        expect(result).toBeDefined();
        expect(result!.externalIdentifier).toBe('TEST-001');
        expect(result!.status).toBe(DataSourceStatus.PENDING);
      });

      it('should return null for non-existent external identifier', async () => {
        const result = await dataSourceCrudService.findByExternalIdentifier('NON-EXISTENT');
        expect(result).toBeNull();
      });
    });

    describe('upsertByExternalIdentifier', () => {
      it('should create new data source when it does not exist', async () => {
        const newData = {
          externalIdentifier: 'TEST-002',
          origin: DataSourceOrigin.NFDI4HEALTH,
          status: DataSourceStatus.PENDING,
          titles: [{ language: Language.EN, value: 'New Data Source' }],
          descriptions: [{ language: Language.EN, value: 'New description' }],
          classification: 'Study',
          collectionId: 1,
          collection: 'Test Collection',
          active: false,
        };

        const result = await dataSourceCrudService.upsertByExternalIdentifier('TEST-002', newData);

        expect(result.created).toBe(true);

        const found = await dataSourceModel.findOne({ externalIdentifier: 'TEST-002' });
        expect(found).toBeDefined();
        expect(found!.titles[0].value).toBe('New Data Source');
      });

      it('should update existing data source when it exists', async () => {
        await dataSourceModel.create({
          externalIdentifier: 'TEST-003',
          origin: DataSourceOrigin.NFDI4HEALTH,
          status: DataSourceStatus.APPROVED,
          titles: [{ language: Language.EN, value: 'Original Title' }],
          descriptions: [{ language: Language.EN, value: 'Original description' }],
          classification: 'Study',
          collectionId: 1,
          collection: 'Test Collection',
          active: true,
        });

        const updatedData = {
          externalIdentifier: 'TEST-003',
          origin: DataSourceOrigin.NFDI4HEALTH,
          status: DataSourceStatus.APPROVED,
          titles: [{ language: Language.EN, value: 'Updated Title' }],
          descriptions: [{ language: Language.EN, value: 'Updated description' }],
          classification: 'Study',
          collectionId: 1,
          collection: 'Test Collection',
          active: true,
        };

        const result = await dataSourceCrudService.upsertByExternalIdentifier('TEST-003', updatedData);

        expect(result.created).toBe(false);

        const found = await dataSourceModel.findOne({ externalIdentifier: 'TEST-003' });
        expect(found!.titles[0].value).toBe('Updated Title');
      });

      it('should preserve status and active fields when updating existing data source', async () => {
        await dataSourceModel.create({
          externalIdentifier: 'TEST-004',
          origin: DataSourceOrigin.NFDI4HEALTH,
          status: DataSourceStatus.APPROVED,
          titles: [{ language: Language.EN, value: 'Original Title' }],
          descriptions: [],
          classification: 'Study',
          collectionId: 1,
          collection: 'Test Collection',
          active: true,
        });

        const updatedData = {
          externalIdentifier: 'TEST-004',
          origin: DataSourceOrigin.NFDI4HEALTH,
          status: DataSourceStatus.PENDING,
          titles: [{ language: Language.EN, value: 'Updated Title' }],
          descriptions: [{ language: Language.EN, value: 'New description' }],
          classification: 'Study',
          collectionId: 1,
          collection: 'Test Collection',
          active: false,
        };

        const result = await dataSourceCrudService.upsertByExternalIdentifier('TEST-004', updatedData);

        expect(result.created).toBe(false);

        const found = await dataSourceModel.findOne({ externalIdentifier: 'TEST-004' });
        expect(found!.status).toBe(DataSourceStatus.APPROVED);
        expect(found!.active).toBe(true);
      });
    });

    describe('updateByExternalIdentifier', () => {
      it('should update data source fields', async () => {
        await dataSourceModel.create({
          externalIdentifier: 'TEST-005',
          origin: DataSourceOrigin.NFDI4HEALTH,
          status: DataSourceStatus.PENDING,
          titles: [{ language: Language.EN, value: 'Original Title' }],
          descriptions: [],
          classification: 'Study',
          collectionId: 1,
          collection: 'Test Collection',
          active: false,
        });

        const updated = await dataSourceCrudService.updateByExternalIdentifier('TEST-005', {
          titles: [{ language: Language.EN, value: 'Updated Title' }],
          descriptions: [{ language: Language.EN, value: 'Updated description' }],
        });

        expect(updated).toBe(true);

        const found = await dataSourceModel.findOne({ externalIdentifier: 'TEST-005' });
        expect(found!.titles[0].value).toBe('Updated Title');
        expect(found!.descriptions[0].value).toBe('Updated description');
      });

      it('should return null for non-existent external identifier', async () => {
        const result = await dataSourceCrudService.updateByExternalIdentifier('NON-EXISTENT', {
          titles: [{ language: Language.EN, value: 'Some title' }],
        });

        expect(result).toBe(false);
      });
    });

    describe('updateStatus', () => {
      it('should update status of data source', async () => {
        await dataSourceModel.create({
          externalIdentifier: 'TEST-006',
          origin: DataSourceOrigin.NFDI4HEALTH,
          status: DataSourceStatus.PENDING,
          titles: [{ language: Language.EN, value: 'Test Source' }],
          descriptions: [],
          classification: 'Study',
          collectionId: 1,
          collection: 'Test Collection',
          active: false,
        });

        const updated = await dataSourceCrudService.updateStatus('TEST-006', DataSourceStatus.APPROVED);

        expect(updated).toBe(true);

        const found = await dataSourceModel.findOne({ externalIdentifier: 'TEST-006' });
        expect(found!.status).toBe(DataSourceStatus.APPROVED);
      });

      it('should return false for non-existent external identifier', async () => {
        const result = await dataSourceCrudService.updateStatus('NON-EXISTENT', DataSourceStatus.APPROVED);
        expect(result).toBe(false);
      });
    });

    describe('updateActive', () => {
      it('should update active flag of data source', async () => {
        await dataSourceModel.create({
          externalIdentifier: 'TEST-007',
          origin: DataSourceOrigin.NFDI4HEALTH,
          status: DataSourceStatus.APPROVED,
          titles: [{ language: Language.EN, value: 'Test Source' }],
          descriptions: [],
          classification: 'Study',
          collectionId: 1,
          collection: 'Test Collection',
          active: false,
        });

        const updated = await dataSourceCrudService.updateActive('TEST-007', true);

        expect(updated).toBe(true);

        const found = await dataSourceModel.findOne({ externalIdentifier: 'TEST-007' });
        expect(found!.active).toBe(true);
      });

      it('should return false for non-existent external identifier', async () => {
        const result = await dataSourceCrudService.updateActive('NON-EXISTENT', true);
        expect(result).toBe(false);
      });
    });

    describe('findAll', () => {
      it('should return all data sources', async () => {
        await dataSourceModel.insertMany([
          {
            externalIdentifier: 'TEST-010',
            origin: DataSourceOrigin.NFDI4HEALTH,
            status: DataSourceStatus.APPROVED,
            titles: [{ language: Language.EN, value: 'First Source' }],
            descriptions: [],
            classification: 'Study',
            collectionId: 1,
            collection: 'Test Collection',
            active: true,
          },
          {
            externalIdentifier: 'TEST-011',
            origin: DataSourceOrigin.NFDI4HEALTH,
            status: DataSourceStatus.PENDING,
            titles: [{ language: Language.EN, value: 'Second Source' }],
            descriptions: [],
            classification: 'Study',
            collectionId: 1,
            collection: 'Test Collection',
            active: false,
          },
        ]);

        const result = await dataSourceCrudService.findAll();

        expect(result).toHaveLength(2);
        expect(result.map((ds) => ds.externalIdentifier)).toContain('TEST-010');
        expect(result.map((ds) => ds.externalIdentifier)).toContain('TEST-011');
      });

      it('should return empty array when no data sources exist', async () => {
        const result = await dataSourceCrudService.findAll();
        expect(result).toEqual([]);
      });
    });

    describe('searchByQueryAndStatus', () => {
      beforeEach(async () => {
        await dataSourceModel.insertMany([
          {
            externalIdentifier: 'NFDI-001',
            origin: DataSourceOrigin.NFDI4HEALTH,
            status: DataSourceStatus.APPROVED,
            titles: [
              { language: Language.EN, value: 'Cancer Research Study' },
              { language: Language.DE, value: 'Krebsforschungsstudie' },
            ],
            descriptions: [{ language: Language.EN, value: 'Study about cancer' }],
            classification: 'Study',
            collectionId: 1,
            collection: 'Test Collection',
            active: true,
          },
          {
            externalIdentifier: 'NFDI-002',
            origin: DataSourceOrigin.NFDI4HEALTH,
            status: DataSourceStatus.PENDING,
            titles: [
              { language: Language.EN, value: 'Diabetes Study' },
              { language: Language.DE, value: 'Diabetes-Studie' },
            ],
            descriptions: [],
            classification: 'Study',
            collectionId: 1,
            collection: 'Test Collection',
            active: false,
          },
          {
            externalIdentifier: 'NFDI-003',
            origin: DataSourceOrigin.NFDI4HEALTH,
            status: DataSourceStatus.APPROVED,
            titles: [
              { language: Language.EN, value: 'Heart Disease Research' },
              { language: Language.DE, value: 'Herzerkrankungsforschung' },
            ],
            descriptions: [],
            classification: 'Study',
            collectionId: 1,
            collection: 'Test Collection',
            active: true,
          },
        ]);
      });

      it('should search by external identifier', async () => {
        const result = await dataSourceCrudService.searchByQueryAndStatus(false, 'NFDI-002', undefined, 0, 10);

        expect(result.data).toHaveLength(1);
        expect(result.data[0].externalIdentifier).toBe('NFDI-002');
        expect(result.total).toBe(1);
      });

      it('should search by title text', async () => {
        const result = await dataSourceCrudService.searchByQueryAndStatus(false, 'Cancer', undefined, 0, 10);

        expect(result.data).toHaveLength(1);
        expect(result.data[0].externalIdentifier).toBe('NFDI-001');
      });

      it('should search case-insensitively', async () => {
        const result = await dataSourceCrudService.searchByQueryAndStatus(false, 'diabetes', undefined, 0, 10);

        expect(result.data).toHaveLength(1);
        expect(result.data[0].externalIdentifier).toBe('NFDI-002');
      });

      it('should return all when no search query provided', async () => {
        const result = await dataSourceCrudService.searchByQueryAndStatus(false, '', undefined, 0, 10);

        expect(result.data).toHaveLength(3);
        expect(result.total).toBe(3);
      });

      it('should filter by status', async () => {
        const result = await dataSourceCrudService.searchByQueryAndStatus(false, '', DataSourceStatus.APPROVED, 0, 10);

        expect(result.data).toHaveLength(2);
        expect(result.data.every((ds) => ds.status === DataSourceStatus.APPROVED)).toBe(true);
      });

      it('should paginate results', async () => {
        const page1 = await dataSourceCrudService.searchByQueryAndStatus(false, '', undefined, 0, 2);
        const page2 = await dataSourceCrudService.searchByQueryAndStatus(false, '', undefined, 2, 2);

        expect(page1.data).toHaveLength(2);
        expect(page2.data).toHaveLength(1);
        expect(page1.total).toBe(3);
        expect(page2.total).toBe(3);
      });

      it('should sort by title ascending', async () => {
        const result = await dataSourceCrudService.searchByQueryAndStatus(
          false,
          '',
          undefined,
          0,
          10,
          DataSourceSortField.TITLE,
          SortOrder.ASC,
          Language.EN,
        );

        expect(result.data).toHaveLength(3);
        expect(result.data[0].titles.find((t) => t.language === Language.EN)?.value).toBe('Cancer Research Study');
        expect(result.data[1].titles.find((t) => t.language === Language.EN)?.value).toBe('Diabetes Study');
        expect(result.data[2].titles.find((t) => t.language === Language.EN)?.value).toBe('Heart Disease Research');
      });

      it('should sort by title descending', async () => {
        const result = await dataSourceCrudService.searchByQueryAndStatus(
          false,
          '',
          undefined,
          0,
          10,
          DataSourceSortField.TITLE,
          SortOrder.DESC,
          Language.EN,
        );

        expect(result.data).toHaveLength(3);
        expect(result.data[0].titles.find((t) => t.language === Language.EN)?.value).toBe('Heart Disease Research');
        expect(result.data[2].titles.find((t) => t.language === Language.EN)?.value).toBe('Cancer Research Study');
      });

      it('should sort by external identifier', async () => {
        const result = await dataSourceCrudService.searchByQueryAndStatus(
          false,
          '',
          undefined,
          0,
          10,
          DataSourceSortField.EXTERNAL_IDENTIFIER,
          SortOrder.ASC,
        );

        expect(result.data).toHaveLength(3);
        expect(result.data[0].externalIdentifier).toBe('NFDI-001');
        expect(result.data[1].externalIdentifier).toBe('NFDI-002');
        expect(result.data[2].externalIdentifier).toBe('NFDI-003');
      });

      it('should sort by status', async () => {
        const result = await dataSourceCrudService.searchByQueryAndStatus(
          false,
          '',
          undefined,
          0,
          10,
          DataSourceSortField.STATUS,
          SortOrder.ASC,
        );

        expect(result.data).toHaveLength(3);
        // APPROVED comes before PENDING alphabetically
        expect(result.data[0].status).toBe(DataSourceStatus.APPROVED);
        expect(result.data[2].status).toBe(DataSourceStatus.PENDING);
      });

      it('should use preferred language for title sorting', async () => {
        const resultEn = await dataSourceCrudService.searchByQueryAndStatus(
          false,
          '',
          undefined,
          0,
          10,
          DataSourceSortField.TITLE,
          SortOrder.ASC,
          Language.EN,
        );
        const resultDe = await dataSourceCrudService.searchByQueryAndStatus(
          false,
          '',
          undefined,
          0,
          10,
          DataSourceSortField.TITLE,
          SortOrder.ASC,
          Language.DE,
        );

        // Both should return all 3, but sorted by their respective language titles
        expect(resultEn.data).toHaveLength(3);
        expect(resultDe.data).toHaveLength(3);

        expect(resultEn.data[0].titles.find((t) => t.language === Language.EN)?.value).toBe('Cancer Research Study');
        expect(resultDe.data[0].titles.find((t) => t.language === Language.DE)?.value).toBe('Diabetes-Studie');
      });

      it('should filter only active when onlyActive is true', async () => {
        const result = await dataSourceCrudService.searchByQueryAndStatus(true, '', undefined, 0, 10);

        expect(result.data).toHaveLength(2);
        expect(result.data.every((ds) => ds.active === true)).toBe(true);
        expect(result.data.every((ds) => ds.status === DataSourceStatus.APPROVED)).toBe(true);
      });
    });
  },
);
