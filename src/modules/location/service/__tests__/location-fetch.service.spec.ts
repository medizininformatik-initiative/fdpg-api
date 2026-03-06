import { Test, TestingModule } from '@nestjs/testing';
import { LocationFetchService } from '../location-fetch.service';
import { MiiCodesystemClient } from '../../client/mii-codesystem.client';
import { MiiCodesystemLocationDto } from '../../dto/mii-codesystem-location.dto';

describe('LocationFetchService', () => {
  let service: LocationFetchService;
  let mockAxios: any;

  beforeEach(async () => {
    // Create a mock Axios instance
    mockAxios = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationFetchService,
        {
          provide: MiiCodesystemClient,
          useValue: {
            client: mockAxios,
          },
        },
      ],
    }).compile();

    service = module.get<LocationFetchService>(LocationFetchService);
  });

  describe('fetchLocationsFromApi', () => {
    it('should fetch and map valid API response to DTOs', async () => {
      // Arrange
      const rawResponse = {
        data: {
          concept: [
            {
              code: 'LOC-1',
              display: 'Location One',
              definition: 'Description of Loc 1',
              property: [
                { code: 'consortium', valueString: 'MII' },
                { code: 'uri', valueString: 'http://loc1.com' },
                { code: 'dic', valueBoolean: true },
                { code: 'dataManagement', valueBoolean: false },
                { code: 'status', valueCode: 'Active' }, // Should be lowercased
                { code: 'deprecationDate', valueDateTime: '2025-01-01' },
              ],
            },
            {
              code: 'LOC-2', // Minimal properties
              display: 'Location Two',
              property: [],
            },
          ],
        },
      };

      mockAxios.get.mockResolvedValue(rawResponse);

      // Act
      const result = await service.fetchLocationsFromApi();

      // Assert
      expect(mockAxios.get).toHaveBeenCalledWith('');
      expect(result).toHaveLength(2);

      // Verify Full Mapping
      const loc1 = result[0];
      expect(loc1.code).toBe('LOC-1');
      expect(loc1.display).toBe('Location One');
      expect(loc1.consortium).toBe('MII');
      expect(loc1.uri).toBe('http://loc1.com');
      expect(loc1.dic).toBe(true);
      expect(loc1.dataManagement).toBe(false);
      expect(loc1.status).toBe('active'); // Lowercase check
      expect(loc1.deprecationDate).toBe('2025-01-01');

      // Verify Minimal/Default Mapping
      const loc2 = result[1];
      expect(loc2.code).toBe('LOC-2');
      expect(loc2.dic).toBe(false); // Default ?? false
      expect(loc2.dataManagement).toBe(false); // Default ?? false
      expect(loc2.consortium).toBeUndefined();
    });

    it('should filter out invalid concepts (null or missing code)', async () => {
      const rawResponse = {
        data: {
          concept: [{ code: 'VALID', property: [] }, null, { display: 'Missing Code' }, undefined],
        },
      };

      mockAxios.get.mockResolvedValue(rawResponse);

      const result = await service.fetchLocationsFromApi();

      expect(result).toHaveLength(1);
      expect(result[0].code).toBe('VALID');
    });

    it('should throw Error if API response structure is invalid (missing concept array)', async () => {
      const invalidResponse = {
        data: {
          // 'concept' is missing
          foo: 'bar',
        },
      };

      mockAxios.get.mockResolvedValue(invalidResponse);

      await expect(service.fetchLocationsFromApi()).rejects.toThrow('Invalid API response');
    });

    it('should map replacedBy and replaces properties correctly', async () => {
      const rawResponse = {
        data: {
          concept: [
            {
              code: 'OLD',
              property: [{ code: 'replacedBy', valueCode: 'NEW' }],
            },
            {
              code: 'NEW',
              property: [{ code: 'replaces', valueCode: 'OLD' }],
            },
          ],
        },
      };

      mockAxios.get.mockResolvedValue(rawResponse);

      const result = await service.fetchLocationsFromApi();

      expect(result[0].replacedBy).toBe('NEW');
      expect(result[1].replaces).toBe('OLD');
    });
  });

  describe('getPropertyValue (private logic)', () => {
    // Since getPropertyValue is private, we test it via fetchLocationsFromApi scenarios
    // specifically targeting data types.

    it('should correctly extract values based on expected type', async () => {
      const rawResponse = {
        data: {
          concept: [
            {
              code: 'TEST',
              property: [
                { code: 'stringProp', valueString: 'str-val' },
                { code: 'codeProp', valueCode: 'code-val' },
                { code: 'booleanProp', valueBoolean: true },
                { code: 'dateProp', valueDateTime: '2020-01-01' },
              ],
            },
          ],
        },
      };

      // We override the map function locally or just assume the service uses specific keys.
      // Since the service hardcodes 'consortium' -> 'string', we mock a response
      // where we put the 'valueString' into the 'consortium' property to test that logic.

      const testPayload = {
        data: {
          concept: [
            {
              code: 'TEST',
              property: [
                { code: 'consortium', valueString: 'My Consortium' }, // string
                { code: 'status', valueCode: 'ACTIVE' }, // code
                { code: 'dic', valueBoolean: true }, // boolean
                { code: 'deprecationDate', valueDateTime: '2099-01-01' }, // date
              ],
            },
          ],
        },
      };

      mockAxios.get.mockResolvedValue(testPayload);

      const result = await service.fetchLocationsFromApi();
      const loc = result[0];

      expect(loc.consortium).toBe('My Consortium'); // string mapped correctly
      expect(loc.status).toBe('active'); // code mapped correctly (and lowercased)
      expect(loc.dic).toBe(true); // boolean mapped correctly
      expect(loc.deprecationDate).toBe('2099-01-01'); // date mapped correctly
    });

    it('should return undefined if property is missing', async () => {
      const testPayload = {
        data: { concept: [{ code: 'TEST', property: [] }] },
      };
      mockAxios.get.mockResolvedValue(testPayload);

      const result = await service.fetchLocationsFromApi();
      expect(result[0].consortium).toBeUndefined();
    });
  });
});
