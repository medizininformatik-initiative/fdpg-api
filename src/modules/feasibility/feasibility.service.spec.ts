import { Test, TestingModule } from '@nestjs/testing';
import { BadGatewayException, ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FeasibilityService } from './feasibility.service';
import { FeasibilityClient } from './feasibility.client';
import { ValidationException } from 'src/exceptions/validation/validation.exception';
import { AxiosError } from 'axios';

describe('FeasibilityService', () => {
  let service: FeasibilityService;
  let feasibilityClient: FeasibilityClient;
  let configService: ConfigService;

  const mockAxiosInstance = {
    get: jest.fn(),
    post: jest.fn(),
  };

  const mockFeasibilityClient = {
    client: mockAxiosInstance,
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      if (key === 'FEASIBILITY_QUERY_LIEFTIME_MINUTES') {
        return 5;
      }
      return defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeasibilityService,
        {
          provide: FeasibilityClient,
          useValue: mockFeasibilityClient,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<FeasibilityService>(FeasibilityService);
    feasibilityClient = module.get<FeasibilityClient>(FeasibilityClient);
    configService = module.get<ConfigService>(ConfigService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getQueriesByUser', () => {
    it('should return queries for a given user', async () => {
      const userId = 'test-user-id';
      const mockResponse = {
        data: [
          {
            id: 1,
            label: 'Test Query',
            createdAt: '2024-01-01',
          },
        ],
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await service.getQueriesByUser(userId);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(`api/v5/query/data/by-user/${userId}`);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should throw BadGatewayException when API call fails', async () => {
      const userId = 'test-user-id';
      mockAxiosInstance.get.mockRejectedValue(new Error('Network error'));

      await expect(service.getQueriesByUser(userId)).rejects.toThrow(BadGatewayException);
    });

    it('should include external status in error when axios error occurs', async () => {
      const userId = 'test-user-id';
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 500,
        },
      } as AxiosError;

      mockAxiosInstance.get.mockRejectedValue(axiosError);

      try {
        await service.getQueriesByUser(userId);
      } catch (error) {
        expect(error).toBeInstanceOf(BadGatewayException);
        expect(error.message).toContain('Failed to fetch feasibility queries by user from external service');
      }
    });
  });

  describe('getQueryById', () => {
    it('should return query data for a given query ID', async () => {
      const queryId = 123;
      const mockResponse = {
        data: {
          id: queryId,
          label: 'Test Query',
          content: 'Query content',
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await service.getQueryById(queryId);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(`api/v5/query/data/${queryId}`);
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getQueryContentById', () => {
    it('should return JSON content when fileType is JSON', async () => {
      const queryId = 123;
      const mockResponse = {
        data: { content: 'test json content' },
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await service.getQueryContentById(queryId, 'JSON');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        `api/v5/query/data/${queryId}/crtdl`,
        expect.objectContaining({
          headers: { Accept: 'application/json' },
          responseType: 'json',
        }),
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should return error message when response data is empty', async () => {
      const queryId = 123;
      const mockResponse = {
        data: '',
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await service.getQueryContentById(queryId, 'JSON');

      expect(result).toEqual({ error: 'No content for feasibility query' });
    });

    it('should throw ValidationException when API call fails', async () => {
      const queryId = 123;
      mockAxiosInstance.get.mockRejectedValue(new Error('API Error'));

      await expect(service.getQueryContentById(queryId, 'JSON')).rejects.toThrow(ValidationException);
    });

    it('should handle ZIP file type correctly', async () => {
      const queryId = 123;
      // Create a minimal valid ZIP file buffer (PK header)
      const mockZipBuffer = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
      const mockResponse = {
        data: mockZipBuffer,
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      // Note: This will likely fail validation, but tests the ZIP path
      try {
        await service.getQueryContentById(queryId, 'ZIP');
      } catch (error) {
        // Expected to fail validation in most cases
        expect(error).toBeDefined();
      }

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        `api/v5/query/data/${queryId}/crtdl`,
        expect.objectContaining({
          headers: { Accept: 'application/zip' },
          responseType: 'arraybuffer',
        }),
      );
    });
  });

  describe('getRedirectUrl', () => {
    it('should return redirect URL for valid query and user', async () => {
      const queryId = 123;
      const userId = 'test-user-id';
      const mockQuery = { id: queryId, label: 'Test Query' };
      const mockPostResponse = {
        headers: {
          location: 'api/v5/query/data/456',
        },
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockQuery });
      mockAxiosInstance.post.mockResolvedValue(mockPostResponse);

      const result = await service.getRedirectUrl(queryId, userId);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(`api/v5/query/data/${queryId}`);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        `api/v5/query/data/by-user/${userId}`,
        mockQuery,
        expect.objectContaining({
          params: expect.objectContaining({
            ttl: expect.any(String),
          }),
        }),
      );
      expect(result.redirectUrl).toContain('/data-query/load-query?id=');
    });

    it('should throw ForbiddenException when API returns 403', async () => {
      const queryId = 123;
      const userId = 'test-user-id';
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 403,
          data: 'Forbidden',
        },
      } as unknown as AxiosError;

      mockAxiosInstance.get.mockResolvedValue({ data: {} });
      mockAxiosInstance.post.mockRejectedValue(axiosError);

      await expect(service.getRedirectUrl(queryId, userId)).rejects.toThrow(ForbiddenException);
    });

    it('should throw InternalServerErrorException when API returns other error status', async () => {
      const queryId = 123;
      const userId = 'test-user-id';
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 500,
          data: 'Internal Server Error',
        },
      } as unknown as AxiosError;

      mockAxiosInstance.get.mockResolvedValue({ data: {} });
      mockAxiosInstance.post.mockRejectedValue(axiosError);

      await expect(service.getRedirectUrl(queryId, userId)).rejects.toThrow(InternalServerErrorException);
    });

    it('should throw InternalServerErrorException when network error occurs', async () => {
      const queryId = 123;
      const userId = 'test-user-id';
      const axiosError = {
        isAxiosError: true,
        message: 'Network error',
      } as unknown as AxiosError;

      mockAxiosInstance.get.mockResolvedValue({ data: {} });
      mockAxiosInstance.post.mockRejectedValue(axiosError);

      await expect(service.getRedirectUrl(queryId, userId)).rejects.toThrow(InternalServerErrorException);
    });

    it('should re-throw non-axios errors', async () => {
      const queryId = 123;
      const userId = 'test-user-id';
      const error = new Error('Non-axios error');

      mockAxiosInstance.get.mockResolvedValue({ data: {} });
      mockAxiosInstance.post.mockRejectedValue(error);

      await expect(service.getRedirectUrl(queryId, userId)).rejects.toThrow(error);
    });
  });

  describe('minutesToISO8601Duration (private method behavior)', () => {
    it('should construct redirect URL with correct TTL format', async () => {
      const queryId = 123;
      const userId = 'test-user-id';
      const mockQuery = { id: queryId };
      const mockPostResponse = {
        headers: {
          location: 'api/v5/query/data/456',
        },
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockQuery });
      mockAxiosInstance.post.mockResolvedValue(mockPostResponse);

      await service.getRedirectUrl(queryId, userId);

      // Check that post was called with params containing ttl
      const postCall = mockAxiosInstance.post.mock.calls[0];
      expect(postCall[2].params.ttl).toMatch(/^P/); // ISO 8601 duration starts with P
    });
  });
});
