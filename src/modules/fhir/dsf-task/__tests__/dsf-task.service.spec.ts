import { Test, TestingModule } from '@nestjs/testing';
import { DsfTaskService } from '../dsf-task.service';
import { FhirClient } from '../../fhir.client';
import { Logger } from '@nestjs/common';
import { FhirTaskCoordinateSharingPayloadFactory } from '../fhir-task-coordinate-sharing-payload.factory';
import { FhirHelpersUtil } from '../../util/fhir-helpers.util';
import { mapTaskTableResponse } from '../../util/fhir-received-dataset.util';
import { FHIR_SYSTEM_CONSTANTS } from '../../constants/fhir-constants';

jest.mock('../fhir-task-coordinate-sharing-payload.factory');
jest.mock('../../util/fhir-helpers.util');
jest.mock('../../util/fhir-received-dataset.util');

describe('DsfTaskService', () => {
  let service: DsfTaskService;
  let apiClientMock: any;

  const mockBusinessKey = 'BUS-123';
  const mockTaskId = 'TASK-ABC';

  beforeEach(async () => {
    apiClientMock = {
      post: jest.fn(),
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DsfTaskService,
        {
          provide: FhirClient,
          useValue: {
            client: apiClientMock, // Inject the mocked axios instance
          },
        },
      ],
    }).compile();

    service = module.get<DsfTaskService>(DsfTaskService);

    jest.spyOn(Logger.prototype, 'verbose').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});

    jest.clearAllMocks();
  });

  describe('startCoordinateDataSharingProcess', () => {
    const startParams = {
      businessKey: mockBusinessKey,
      hrpOrganizationIdentifier: 'HRP-1',
      projectIdentifier: 'PROJ-1',
      contractUrl: 'http://contract',
      dmsIdentifier: 'DMS-1',
    };

    it('should successfully create a task and return data', async () => {
      const mockTaskPayload = { resourceType: 'Task' };
      const mockResponse = { data: { id: mockTaskId } };

      (FhirTaskCoordinateSharingPayloadFactory.createStartProcessPayload as jest.Mock).mockReturnValue(mockTaskPayload);
      apiClientMock.post.mockResolvedValue(mockResponse);

      const result = await service.startCoordinateDataSharingProcess(startParams);

      expect(FhirTaskCoordinateSharingPayloadFactory.createStartProcessPayload).toHaveBeenCalledWith(
        expect.objectContaining({ businessKey: mockBusinessKey }),
      );
      expect(apiClientMock.post).toHaveBeenCalledWith('/Task', mockTaskPayload);
      expect(result).toEqual(mockResponse.data);
    });

    it('should throw an error if the api call fails', async () => {
      (FhirTaskCoordinateSharingPayloadFactory.createStartProcessPayload as jest.Mock).mockReturnValue({});
      apiClientMock.post.mockRejectedValue(new Error('API Error'));

      await expect(service.startCoordinateDataSharingProcess(startParams)).rejects.toThrow(
        'Clould not initiate process',
      );
    });
  });

  describe('getResultUrlByTaskId', () => {
    it('should return the url if found in task output', async () => {
      const mockTaskResponse = {
        data: {
          id: mockTaskId,
          output: [
            {
              type: { coding: [{ code: 'data-set-url' }] },
              valueUrl: 'http://result-url.com',
            },
          ],
        },
      };

      apiClientMock.get.mockResolvedValue(mockTaskResponse);

      const result = await service.getResultUrlByTaskId(mockTaskId);

      expect(apiClientMock.get).toHaveBeenCalledWith(`/Task/${mockTaskId}`);
      expect(result).toBe('http://result-url.com');
    });

    it('should return undefined if output array is missing', async () => {
      apiClientMock.get.mockResolvedValue({ data: { id: mockTaskId } }); // No output

      const result = await service.getResultUrlByTaskId(mockTaskId);

      expect(result).toBeUndefined();
    });

    it('should return undefined if specific code is not found', async () => {
      const mockTaskResponse = {
        data: {
          output: [{ type: { coding: [{ code: 'wrong-code' }] }, valueUrl: 'xyz' }],
        },
      };
      apiClientMock.get.mockResolvedValue(mockTaskResponse);

      const result = await service.getResultUrlByTaskId(mockTaskId);

      expect(result).toBeUndefined();
    });
  });

  describe('pollForReceivedDataSetsByBusinessKey', () => {
    beforeEach(() => {
      // Mock the timestamp helper
      (FhirHelpersUtil.subtractOneHour as jest.Mock).mockReturnValue(new Date('2023-01-01'));
    });

    it('should poll, map results, and filter by business key', async () => {
      // 1. Setup raw FHIR entries
      const rawEntry1 = { resource: { id: '1' } };
      const rawEntry2 = { resource: { id: '2' } };

      // 2. Setup Mapped Results
      // One matches the business key, one does not
      (mapTaskTableResponse as jest.Mock)
        .mockReturnValueOnce({ 'business-key': mockBusinessKey, id: '1' })
        .mockReturnValueOnce({ 'business-key': 'OTHER-KEY', id: '2' });

      // 3. Mock the Generator
      // This is crucial: we mock the static helper to return an async generator that yields our raw entries
      const asyncGeneratorMock = async function* () {
        yield [rawEntry1, rawEntry2];
      };
      (FhirHelpersUtil.paginateFhirTaskGenerator as jest.Mock).mockReturnValue(asyncGeneratorMock());

      const result = await service.pollForReceivedDataSetsByBusinessKey(mockBusinessKey);

      // Assertions
      expect(FhirHelpersUtil.paginateFhirTaskGenerator).toHaveBeenCalled();
      expect(mapTaskTableResponse).toHaveBeenCalledTimes(2);

      // Should only contain the one matching the business key
      expect(result).toHaveLength(1);
      expect(result[0]['business-key']).toBe(mockBusinessKey);
    });

    it('should return all results if no business key is provided', async () => {
      const rawEntry = { resource: { id: '1' } };
      (mapTaskTableResponse as jest.Mock).mockReturnValue({ 'business-key': 'ANY', id: '1' });

      const asyncGeneratorMock = async function* () {
        yield [rawEntry];
      };
      (FhirHelpersUtil.paginateFhirTaskGenerator as jest.Mock).mockReturnValue(asyncGeneratorMock());

      const result = await service.pollForReceivedDataSetsByBusinessKey(undefined);

      expect(result).toHaveLength(1);
    });

    it('should stop polling after reaching MAX_PAGINATION_REQUEST_COUNT', async () => {
      // Create a generator that yields indefinitely (or more than 10 times)
      const asyncGeneratorMock = async function* () {
        for (let i = 0; i < 15; i++) {
          yield [{ id: i }]; // Yield simple data
        }
      };
      (FhirHelpersUtil.paginateFhirTaskGenerator as jest.Mock).mockReturnValue(asyncGeneratorMock());
      (mapTaskTableResponse as jest.Mock).mockImplementation((e) => ({ 'business-key': mockBusinessKey }));

      await service.pollForReceivedDataSetsByBusinessKey(mockBusinessKey);
      expect(Logger.prototype.warn).toHaveBeenCalledWith(expect.stringContaining('Reached maximum request count'));
    });

    it('should handle errors during polling', async () => {
      const error = new Error('Pagination failed');
      (FhirHelpersUtil.paginateFhirTaskGenerator as jest.Mock).mockImplementation(() => {
        throw error;
      });

      await expect(service.pollForReceivedDataSetsByBusinessKey(mockBusinessKey)).rejects.toThrow('Pagination failed');
    });
  });
});
