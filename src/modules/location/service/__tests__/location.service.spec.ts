import { Test, TestingModule } from '@nestjs/testing';
import { LocationService } from '../location.service';
import { getModelToken } from '@nestjs/mongoose';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { Location } from '../../schema/location.schema';
import { CacheKey } from 'src/shared/enums/cache-key.enum';
import { LocationDto } from '../../dto/location.dto';
import { LocationKeyLabelDto } from '../../dto/location.dto';

jest.mock('src/modules/proposal/utils/merge-proposal.util', () => ({
  mergeDeep: jest.fn((target, source) => Object.assign(target, source)),
}));

describe('LocationService', () => {
  let service: LocationService;
  let modelMock: any;
  let cacheManagerMock: any;
  let configServiceMock: any;

  const mockLocationObj = { _id: 'loc-1', display: 'Location 1', updated: new Date() };
  const mockLocationDoc = {
    ...mockLocationObj,
    toObject: jest.fn().mockReturnValue(mockLocationObj),
    save: jest.fn(),
  };

  beforeEach(async () => {
    modelMock = {
      findById: jest.fn(),
      find: jest.fn(),
      insertOne: jest.fn(),
    };

    cacheManagerMock = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    configServiceMock = {
      get: jest.fn((key, defaultVal) => defaultVal),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationService,
        {
          provide: getModelToken(Location.name),
          useValue: modelMock,
        },
        {
          provide: CACHE_MANAGER,
          useValue: cacheManagerMock,
        },
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
      ],
    }).compile();

    service = module.get<LocationService>(LocationService);

    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('findById', () => {
    it('should return document if found', async () => {
      modelMock.findById.mockResolvedValue(mockLocationDoc);
      const result = await service.findById('loc-1');
      expect(result).toBe(mockLocationDoc);
      expect(modelMock.findById).toHaveBeenCalledWith('loc-1');
    });

    it('should return null if not found', async () => {
      modelMock.findById.mockResolvedValue(null);
      const result = await service.findById('loc-99');
      expect(result).toBeNull();
    });
  });

  describe('findAllDocuments', () => {
    it('should return all documents from DB', async () => {
      modelMock.find.mockResolvedValue([mockLocationDoc]);
      const result = await service.findAllDocuments();
      expect(result).toEqual([mockLocationDoc]);
      expect(modelMock.find).toHaveBeenCalledWith({});
    });
  });

  describe('findAll', () => {
    it('should return cached data if available (Cache Hit)', async () => {
      const cachedData = [new LocationDto()];
      cacheManagerMock.get.mockResolvedValue(cachedData);

      const result = await service.findAll();

      expect(cacheManagerMock.get).toHaveBeenCalledWith(CacheKey.MiiLocations);
      expect(modelMock.find).not.toHaveBeenCalled();
      expect(result).toBe(cachedData);
    });

    it('should fetch from DB, cache it, and return mapped DTOs (Cache Miss)', async () => {
      cacheManagerMock.get.mockResolvedValue(null);
      modelMock.find.mockResolvedValue([mockLocationDoc]);

      const result = await service.findAll();

      expect(modelMock.find).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(LocationDto);
      expect(result[0]._id).toBe('loc-1');

      expect(cacheManagerMock.set).toHaveBeenCalledWith(CacheKey.MiiLocations, expect.any(Array), expect.any(Number));
    });
  });

  describe('findAllLookUpMap', () => {
    it('should return object map keyed by _id', async () => {
      modelMock.find.mockResolvedValue([mockLocationDoc]);

      const result = await service.findAllLookUpMap();

      expect(result).toEqual({
        'loc-1': mockLocationObj,
      });
    });
  });

  describe('findAllKeyLabel', () => {
    it('should return cached data (Cache Hit)', async () => {
      const cached = [new LocationKeyLabelDto()];
      cacheManagerMock.get.mockResolvedValue(cached);

      const result = await service.findAllKeyLabel();
      expect(result).toBe(cached);
    });

    it('should fetch via findAll, map to KeyLabel, cache and return (Cache Miss)', async () => {
      cacheManagerMock.get.mockResolvedValue(null);
      modelMock.find.mockResolvedValue([mockLocationDoc]);

      const result = await service.findAllKeyLabel();

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(LocationKeyLabelDto);
      expect(result[0].display).toBe('Location 1');

      expect(cacheManagerMock.set).toHaveBeenCalledWith(
        CacheKey.MiiLocationsKeyLabel,
        expect.any(Array),
        expect.any(Number),
      );
    });
  });

  describe('update', () => {
    const updateData = { display: 'Updated Name' } as Location;

    it('should update existing document, save, invalidate cache, and return DTO', async () => {
      const existingDoc = {
        ...mockLocationDoc,
        save: jest.fn().mockResolvedValue({
          toObject: () => ({ ...mockLocationObj, display: 'Updated Name' }),
        }),
      };
      modelMock.findById.mockResolvedValue(existingDoc);

      // Act
      const result = await service.update('loc-1', updateData);

      // Assert
      expect(modelMock.findById).toHaveBeenCalledWith('loc-1');
      // mergeDeep is mocked to assign props
      expect(existingDoc.updated).toBeInstanceOf(Date);
      expect(existingDoc.save).toHaveBeenCalled();

      // Cache invalidation
      expect(cacheManagerMock.del).toHaveBeenCalledWith(CacheKey.MiiLocations);
      expect(cacheManagerMock.del).toHaveBeenCalledWith(CacheKey.MiiLocationsKeyLabel);

      expect(result.display).toBe('Updated Name');
    });

    it('should insert new document if ID not found (Upsert logic)', async () => {
      // Arrange
      modelMock.findById.mockResolvedValue(null);
      const newDoc = {
        toObject: () => ({ _id: 'new-id', display: 'Updated Name' }),
      };
      modelMock.insertOne.mockResolvedValue(newDoc);

      // Act
      const result = await service.update('new-id', updateData);

      // Assert
      expect(modelMock.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          display: 'Updated Name',
          updated: expect.any(Date),
        }),
      );

      expect(cacheManagerMock.del).toHaveBeenCalledTimes(2);
      expect(result._id).toBe('new-id');
    });
  });

  describe('modelToDto', () => {
    it('should convert plain object to DTO', () => {
      const result = service.modelToDto(mockLocationObj as Location);
      expect(result).toBeInstanceOf(LocationDto);
      expect(result._id).toBe('loc-1');
    });
  });
});
