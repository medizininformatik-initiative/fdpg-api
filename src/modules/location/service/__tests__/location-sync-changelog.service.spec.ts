import { Test, TestingModule } from '@nestjs/testing';
import { LocationSyncChangelogService } from '../location-sync-changelog.service';
import { getModelToken } from '@nestjs/mongoose';
import { LocationSyncChangelog } from '../../schema/location-sync-changelog.schema';
import { ForbiddenException } from '@nestjs/common';
import { LocationSyncChangeLogStatus } from '../../enum/location-sync-changelog-status.enum';
import { LocationSyncChangelogStrategy } from '../../enum/location-sync-changelog-strategy.enum';
import { MiiCodesystemLocationDto } from '../../dto/mii-codesystem-location.dto';

describe('LocationSyncChangelogService', () => {
  let service: LocationSyncChangelogService;
  let modelMock: any;

  beforeEach(async () => {
    // Mock Mongoose Model
    modelMock = {
      findById: jest.fn(),
      find: jest.fn(),
      bulkWrite: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationSyncChangelogService,
        {
          provide: getModelToken(LocationSyncChangelog.name),
          useValue: modelMock,
        },
      ],
    }).compile();

    service = module.get<LocationSyncChangelogService>(LocationSyncChangelogService);

    jest.clearAllMocks();
  });

  describe('generateLocationSyncChangelogsFromApi', () => {
    const locId = 'loc-1';

    // Helper to create basic DTO
    const createApiDto = (code: string, display = 'Display'): MiiCodesystemLocationDto =>
      ({
        code,
        display,
        definition: 'def',
        consortium: 'MII',
        contract: 'contract',
        abbreviation: 'abbr',
        uri: 'http://loc',
        dic: true,
        dataManagement: false,
      }) as MiiCodesystemLocationDto;

    // Helper to create matching DB doc
    const createDbDoc = (id: string, display = 'Display') =>
      ({
        id,
        _id: id,
        externalCode: id,
        display,
        definition: 'def',
        consortium: 'MII',
        contract: 'contract',
        abbreviation: 'abbr',
        uri: 'http://loc',
        dataIntegrationCenter: true,
        dataManagementCenter: false,
        deprecated: false,
      }) as any;

    it('should generate INSERT strategy for new locations', async () => {
      // Arrange
      modelMock.find.mockResolvedValue([]); // No pending logs
      const apiMap = new Map([['new-loc', createApiDto('new-loc')]]);
      const persisted = []; // No DB docs

      // Act
      await service.generateLocationSyncChangelogsFromApi(apiMap, persisted);

      // Assert
      expect(modelMock.bulkWrite).toHaveBeenCalledTimes(1);
      const ops = modelMock.bulkWrite.mock.calls[0][0];
      expect(ops).toHaveLength(1);
      expect(ops[0].insertOne.document.strategy).toBe(LocationSyncChangelogStrategy.INSERT);
      expect(ops[0].insertOne.document.forCode).toBe('new-loc');
    });

    it('should generate UPDATE strategy if data differs', async () => {
      // Arrange
      modelMock.find.mockResolvedValue([]);
      const apiMap = new Map([[locId, createApiDto(locId, 'New Display Name')]]);
      const persisted = [createDbDoc(locId, 'Old Display Name')]; // Display differs

      // Act
      await service.generateLocationSyncChangelogsFromApi(apiMap, persisted);

      // Assert
      const ops = modelMock.bulkWrite.mock.calls[0][0];
      expect(ops).toHaveLength(1);
      expect(ops[0].insertOne.document.strategy).toBe(LocationSyncChangelogStrategy.UPDATE);
      expect(ops[0].insertOne.document.oldLocationData.display).toBe('Old Display Name');
      expect(ops[0].insertOne.document.newLocationData.display).toBe('New Display Name');
    });

    it('should generate DEPRECATE strategy if API marks location as deprecated', async () => {
      // Arrange
      modelMock.find.mockResolvedValue([]);
      const apiDto = createApiDto(locId);
      apiDto.status = 'deprecated'; // Mark deprecated
      const apiMap = new Map([[locId, apiDto]]);
      const persisted = [createDbDoc(locId)]; // Was not deprecated

      // Act
      await service.generateLocationSyncChangelogsFromApi(apiMap, persisted);

      // Assert
      const ops = modelMock.bulkWrite.mock.calls[0][0];
      expect(ops[0].insertOne.document.strategy).toBe(LocationSyncChangelogStrategy.DEPRECATE);
    });

    it('should NOT generate changelog if data is identical', async () => {
      // Arrange
      modelMock.find.mockResolvedValue([]);
      const apiMap = new Map([[locId, createApiDto(locId)]]);
      const persisted = [createDbDoc(locId)]; // Identical data

      // Act
      await service.generateLocationSyncChangelogsFromApi(apiMap, persisted);

      // Assert
      // bulkWrite is called only if operations.length > 0 inside processChangeLogs,
      // but if filtering leaves empty array, processChangeLogs might be called with empty array?
      // Looking at implementation: `const changeLogs = ... .filter()`.
      // `processChangeLogs` logs "No changelogs..." if empty and doesn't call bulkWrite.
      expect(modelMock.bulkWrite).not.toHaveBeenCalled();
    });

    it('should update existing PENDING changelog instead of creating new one', async () => {
      // Arrange
      const existingLog = {
        _id: 'log-1',
        forCode: locId,
        status: LocationSyncChangeLogStatus.PENDING,
        toObject: () => ({ _id: 'log-1', forCode: locId, status: LocationSyncChangeLogStatus.PENDING }),
      };
      modelMock.find.mockResolvedValue([existingLog]); // One pending log exists

      const apiMap = new Map([[locId, createApiDto(locId, 'New Name')]]);
      const persisted = [createDbDoc(locId, 'Old Name')];

      // Act
      await service.generateLocationSyncChangelogsFromApi(apiMap, persisted);

      // Assert
      const ops = modelMock.bulkWrite.mock.calls[0][0];
      expect(ops).toHaveLength(1);
      // Should be an updateOne, not insertOne
      expect(ops[0].updateOne).toBeDefined();
      expect(ops[0].updateOne.filter._id).toBe('log-1');
      expect(ops[0].updateOne.update.$set.newLocationData.display).toBe('New Name');
    });
  });

  describe('updateStatus', () => {
    const logId = 'log-1';
    const mockUser = { userId: 'u1' } as any;

    it('should throw ForbiddenException if status transition is invalid', async () => {
      // Case 1: Current status is not PENDING
      const docNotPending = { status: LocationSyncChangeLogStatus.APPROVED };
      modelMock.findById.mockResolvedValue(docNotPending);

      const dto = { status: LocationSyncChangeLogStatus.APPROVED } as any;

      await expect(service.updateStatus(logId, dto, mockUser)).rejects.toThrow(ForbiddenException);

      // Case 2: Target status is invalid (e.g. back to PENDING)
      const docPending = { status: LocationSyncChangeLogStatus.PENDING };
      modelMock.findById.mockResolvedValue(docPending);
      const dtoInvalid = { status: LocationSyncChangeLogStatus.PENDING } as any;

      await expect(service.updateStatus(logId, dtoInvalid, mockUser)).rejects.toThrow(ForbiddenException);
    });

    it('should update status and metadata if valid', async () => {
      const mockDoc = {
        status: LocationSyncChangeLogStatus.PENDING,
        save: jest.fn().mockResolvedValue({ status: LocationSyncChangeLogStatus.APPROVED }),
      };
      modelMock.findById.mockResolvedValue(mockDoc);

      const dto = { status: LocationSyncChangeLogStatus.APPROVED } as any;

      const result = await service.updateStatus(logId, dto, mockUser);

      expect(mockDoc.status).toBe(LocationSyncChangeLogStatus.APPROVED);
      expect(mockDoc.save).toHaveBeenCalled();
      expect(result.status).toBe(LocationSyncChangeLogStatus.APPROVED);
    });
  });

  describe('Utility Methods', () => {
    it('findAllByStatus should query with status', async () => {
      await service.findAllByStatus(LocationSyncChangeLogStatus.PENDING);
      expect(modelMock.find).toHaveBeenCalledWith({ status: LocationSyncChangeLogStatus.PENDING });
    });

    it('findAll should map to DTOs', async () => {
      const mockObj = { _id: '1', strategy: 'INSERT' };
      modelMock.find.mockResolvedValue([
        {
          toObject: () => mockObj,
        },
      ]);

      const result = await service.findAll();

      expect(result[0]).toBeInstanceOf(Object); // plainToClass returns object
      // Simple check to ensure plainToClass ran
      expect(result[0]).toEqual(expect.objectContaining(mockObj));
    });
  });
});
