import { Test, TestingModule } from '@nestjs/testing';
import { DataSourceService } from '../service/data-source.service';
import { DataSourceCrudService } from '../service/data-source-crud.service';
import { DataSourceStatus, DataSourceOrigin, DataSourceSortField, SortOrder } from '../enum/data-source-status.enum';
import { DataSourceDocument } from '../schema/data-source.schema';
import { Language } from 'src/shared/enums/language.enum';

describe('DataSourceService', () => {
  let service: DataSourceService;
  let crudService: jest.Mocked<DataSourceCrudService>;

  const mockDataSourceDocument = (overrides: any = {}) =>
    ({
      toObject: jest.fn().mockReturnValue({
        externalIdentifier: 'TEST-001',
        origin: DataSourceOrigin.NFDI4HEALTH,
        status: DataSourceStatus.PENDING,
        titles: [{ language: 'en', text: 'Test Title' }],
        descriptions: [{ language: 'en', text: 'Test Description' }],
        active: false,
        ...overrides,
      }),
    }) as unknown as DataSourceDocument;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataSourceService,
        {
          provide: DataSourceCrudService,
          useValue: {
            findByExternalIdentifier: jest.fn(),
            findById: jest.fn(),
            searchByQueryAndStatus: jest.fn(),
            updateStatus: jest.fn(),
            updateActive: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DataSourceService>(DataSourceService);
    crudService = module.get(DataSourceCrudService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getByExternalIdentifier', () => {
    it('should return DTO when data source exists', async () => {
      const mockDoc = mockDataSourceDocument();
      crudService.findByExternalIdentifier.mockResolvedValue(mockDoc);

      const result = await service.getByExternalIdentifier('TEST-001');

      expect(result).toBeDefined();
      expect(result?.externalIdentifier).toBe('TEST-001');
      expect(crudService.findByExternalIdentifier).toHaveBeenCalledWith('TEST-001');
    });

    it('should return null when data source does not exist', async () => {
      crudService.findByExternalIdentifier.mockResolvedValue(null);

      const result = await service.getByExternalIdentifier('NON-EXISTENT');

      expect(result).toBeNull();
    });
  });

  describe('getById', () => {
    it('should return DTO when data source exists', async () => {
      const mockDoc = mockDataSourceDocument({ _id: '507f1f77bcf86cd799439011' });
      crudService.findById.mockResolvedValue(mockDoc);

      const result = await service.getById('507f1f77bcf86cd799439011');

      expect(result).toBeDefined();
      expect(crudService.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
    });

    it('should return null when data source does not exist', async () => {
      crudService.findById.mockResolvedValue(null);

      const result = await service.getById('507f1f77bcf86cd799439011');

      expect(result).toBeNull();
    });
  });

  describe('updateStatus', () => {
    it('should update status successfully', async () => {
      crudService.updateStatus.mockResolvedValue(true);

      const result = await service.updateStatus('TEST-001', DataSourceStatus.APPROVED);

      expect(result).toBe(true);
      expect(crudService.updateStatus).toHaveBeenCalledWith('TEST-001', DataSourceStatus.APPROVED);
    });

    it('should return false when data source does not exist', async () => {
      crudService.updateStatus.mockResolvedValue(false);

      const result = await service.updateStatus('NON-EXISTENT', DataSourceStatus.APPROVED);

      expect(result).toBe(false);
    });
  });

  describe('setActive', () => {
    it('should activate data source successfully', async () => {
      crudService.updateActive.mockResolvedValue(true);

      const result = await service.setActive('TEST-001', true);

      expect(result).toBe(true);
      expect(crudService.updateActive).toHaveBeenCalledWith('TEST-001', true);
    });

    it('should deactivate data source successfully', async () => {
      crudService.updateActive.mockResolvedValue(true);

      const result = await service.setActive('TEST-001', false);

      expect(result).toBe(true);
      expect(crudService.updateActive).toHaveBeenCalledWith('TEST-001', false);
    });

    it('should return false when data source does not exist', async () => {
      crudService.updateActive.mockResolvedValue(false);

      const result = await service.setActive('NON-EXISTENT', true);

      expect(result).toBe(false);
    });
  });

  describe('searchWithPagination', () => {
    it('should return paginated search results', async () => {
      const mockDocs = [mockDataSourceDocument(), mockDataSourceDocument({ externalIdentifier: 'TEST-002' })];

      crudService.searchByQueryAndStatus.mockResolvedValue({
        data: mockDocs,
        total: 2,
      });

      const result = await service.searchWithPagination(
        { query: 'test', status: undefined, sortBy: undefined, sortOrder: undefined, language: Language.EN },
        { page: 1, pageSize: 10 },
        false,
      );

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    it('should calculate correct pagination metadata', async () => {
      const mockDocs = Array(25)
        .fill(null)
        .map((_, i) => mockDataSourceDocument({ externalIdentifier: `TEST-${i}` }));

      crudService.searchByQueryAndStatus.mockResolvedValue({
        data: mockDocs.slice(0, 10),
        total: 25,
      });

      const result = await service.searchWithPagination(
        { query: '', status: undefined, sortBy: undefined, sortOrder: undefined, language: Language.EN },
        { page: 1, pageSize: 10 },
        false,
      );

      expect(result.data).toHaveLength(10);
      expect(result.total).toBe(25);
      expect(result.totalPages).toBe(3);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
    });

    it('should pass search parameters to crud service', async () => {
      crudService.searchByQueryAndStatus.mockResolvedValue({
        data: [],
        total: 0,
      });

      await service.searchWithPagination(
        {
          query: 'cancer',
          status: DataSourceStatus.APPROVED,
          sortBy: DataSourceSortField.TITLE,
          sortOrder: SortOrder.ASC,
          language: Language.DE,
        },
        { page: 2, pageSize: 20 },
        true,
      );

      expect(crudService.searchByQueryAndStatus).toHaveBeenCalledWith(
        true,
        'cancer',
        DataSourceStatus.APPROVED,
        20, // skip = (page - 1) * pageSize
        20,
        DataSourceSortField.TITLE,
        SortOrder.ASC,
        'de',
      );
    });

    it('should handle empty results', async () => {
      crudService.searchByQueryAndStatus.mockResolvedValue({
        data: [],
        total: 0,
      });

      const result = await service.searchWithPagination(
        { query: 'non-existent', status: undefined, sortBy: undefined, sortOrder: undefined, language: Language.EN },
        { page: 1, pageSize: 10 },
        false,
      );

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });
  });

  describe('getPaginated', () => {
    it('should get paginated results without status filter', async () => {
      const mockDocs = [mockDataSourceDocument()];

      crudService.searchByQueryAndStatus.mockResolvedValue({
        data: mockDocs,
        total: 1,
      });

      const result = await service.getPaginated(undefined, { page: 1, pageSize: 10 }, false);

      expect(result.data).toHaveLength(1);
      expect(crudService.searchByQueryAndStatus).toHaveBeenCalledWith(
        false,
        undefined,
        undefined,
        0,
        10,
        undefined,
        undefined,
        undefined,
      );
    });

    it('should get paginated results with status filter', async () => {
      const mockDocs = [mockDataSourceDocument({ status: DataSourceStatus.APPROVED })];

      crudService.searchByQueryAndStatus.mockResolvedValue({
        data: mockDocs,
        total: 1,
      });

      const result = await service.getPaginated(DataSourceStatus.APPROVED, { page: 1, pageSize: 10 }, false);

      expect(result.data).toHaveLength(1);
      expect(crudService.searchByQueryAndStatus).toHaveBeenCalledWith(
        false,
        undefined,
        DataSourceStatus.APPROVED,
        0,
        10,
        undefined,
        undefined,
        undefined,
      );
    });

    it('should filter only active data sources when onlyActive is true', async () => {
      crudService.searchByQueryAndStatus.mockResolvedValue({
        data: [],
        total: 0,
      });

      await service.getPaginated(undefined, { page: 1, pageSize: 10 }, true);

      expect(crudService.searchByQueryAndStatus).toHaveBeenCalledWith(
        true,
        undefined,
        undefined,
        0,
        10,
        undefined,
        undefined,
        undefined,
      );
    });
  });
});
