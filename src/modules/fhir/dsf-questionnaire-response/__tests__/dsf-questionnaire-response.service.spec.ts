import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { DsfQuestionnaireResponseService } from '../dsf-questionnaire-response.service';
import { FhirClient } from '../../fhir.client';
import { FhirHelpersUtil } from '../../util/fhir-helpers.util';
import { findConsolidateDataSetsEntryByBusinessKey } from '../dsf-questionnaire-response.util';
import { ValidationException } from 'src/exceptions/validation/validation.exception';
import { BadRequestError } from 'src/shared/enums/bad-request-error.enum';

jest.mock('../../util/fhir-helpers.util');
jest.mock('../dsf-questionnaire-response.util');

describe('DsfQuestionnaireResponseService', () => {
  let service: DsfQuestionnaireResponseService;
  let apiClientMock: any;

  const mockBusinessKey = 'BK-123';
  const mockQResponseId = 'QR-123';

  beforeEach(async () => {
    apiClientMock = {
      put: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DsfQuestionnaireResponseService,
        {
          provide: FhirClient,
          useValue: {
            client: apiClientMock,
          },
        },
      ],
    }).compile();

    service = module.get<DsfQuestionnaireResponseService>(DsfQuestionnaireResponseService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'verbose').mockImplementation(() => {});

    jest.clearAllMocks();
  });

  describe('getQuetionnairResponseReleaseConsolidateDataSets', () => {
    it('should throw an error if businessKey is missing', async () => {
      await expect(service.getQuetionnairResponseReleaseConsolidateDataSets('')).rejects.toThrow(
        'Business key not provided. Cannot search for QuestionnaireResponse.',
      );
    });

    it('should return undefined if the generator returns no pages', async () => {
      const asyncGeneratorMock = async function* () {
        yield [];
      };
      (FhirHelpersUtil.paginateFhirTaskGenerator as jest.Mock).mockReturnValue(asyncGeneratorMock());
      (findConsolidateDataSetsEntryByBusinessKey as jest.Mock).mockReturnValue(undefined);

      const result = await service.getQuetionnairResponseReleaseConsolidateDataSets(mockBusinessKey);

      expect(result).toBeUndefined();
    });

    it('should return undefined if match is not found within max pagination count', async () => {
      const asyncGeneratorMock = async function* () {
        for (let i = 0; i < 15; i++) {
          yield [{ id: `other-${i}` }];
        }
      };
      (FhirHelpersUtil.paginateFhirTaskGenerator as jest.Mock).mockReturnValue(asyncGeneratorMock());
      (findConsolidateDataSetsEntryByBusinessKey as jest.Mock).mockReturnValue(undefined);

      const result = await service.getQuetionnairResponseReleaseConsolidateDataSets(mockBusinessKey);

      expect(result).toBeUndefined();
      expect(Logger.prototype.warn).toHaveBeenCalledWith(expect.stringContaining('Pagination Limit Reached'));
    });

    it('should return the matching resource when found', async () => {
      const mockResource = { id: mockQResponseId, resourceType: 'QuestionnaireResponse' };

      const asyncGeneratorMock = async function* () {
        yield [{ id: 'other' }];
        yield [{ id: mockQResponseId }];
      };

      (FhirHelpersUtil.paginateFhirTaskGenerator as jest.Mock).mockReturnValue(asyncGeneratorMock());

      (findConsolidateDataSetsEntryByBusinessKey as jest.Mock)
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce(mockResource);

      const result = await service.getQuetionnairResponseReleaseConsolidateDataSets(mockBusinessKey);

      expect(result).toEqual(mockResource);
      expect(findConsolidateDataSetsEntryByBusinessKey).toHaveBeenCalledTimes(2);
    });

    it('should throw an error if pagination fails', async () => {
      (FhirHelpersUtil.paginateFhirTaskGenerator as jest.Mock).mockImplementation(() => {
        throw new Error('Network Error');
      });

      await expect(service.getQuetionnairResponseReleaseConsolidateDataSets(mockBusinessKey)).rejects.toThrow(
        'Network Error',
      );
    });
  });

  describe('setReleaseConsolidateDataSetsAnswer', () => {
    const mockExistingItem = { linkId: 'other-item', answer: [] };
    const mockQResponse = {
      id: mockQResponseId,
      resourceType: 'QuestionnaireResponse',
      item: [mockExistingItem, { linkId: 'release', answer: [] }],
      status: 'in-progress',
    };

    it('should throw ValidationException if QuestionnaireResponse is not found', async () => {
      jest.spyOn(service, 'getQuetionnairResponseReleaseConsolidateDataSets').mockResolvedValue(undefined);

      await expect(service.setReleaseConsolidateDataSetsAnswer(mockBusinessKey, true)).rejects.toThrow(
        ValidationException,
      );

      try {
        await service.setReleaseConsolidateDataSetsAnswer(mockBusinessKey, true);
      } catch (error) {
        const exception = error as any;

        const errorList = exception.validationErrors || exception.errors;

        expect(errorList).toBeDefined();
        expect(errorList[0]).toEqual(
          expect.objectContaining({
            code: BadRequestError.FhirQuestionnairResponseNotFound,
          }),
        );
      }
    });

    it('should update status to completed and set accept answer when extend is false', async () => {
      jest.spyOn(service, 'getQuetionnairResponseReleaseConsolidateDataSets').mockResolvedValue(mockQResponse as any);
      apiClientMock.put.mockResolvedValue({ data: {} });

      await service.setReleaseConsolidateDataSetsAnswer(mockBusinessKey, false);

      const expectedPayload = expect.objectContaining({
        id: mockQResponseId,
        status: 'completed',
        item: expect.arrayContaining([
          mockExistingItem,
          expect.objectContaining({
            linkId: 'release',
            answer: [{ valueBoolean: true }],
          }),
        ]),
      });

      expect(apiClientMock.put).toHaveBeenCalledWith(`/QuestionnaireResponse/${mockQResponseId}`, expectedPayload);
    });

    it('should update status to completed and set extend answer when extend is true', async () => {
      jest.spyOn(service, 'getQuetionnairResponseReleaseConsolidateDataSets').mockResolvedValue(mockQResponse as any);
      apiClientMock.put.mockResolvedValue({ data: {} });

      const extendPeriod = 'P7D';
      await service.setReleaseConsolidateDataSetsAnswer(mockBusinessKey, true, extendPeriod);

      const expectedPayload = expect.objectContaining({
        id: mockQResponseId,
        status: 'completed',
        item: expect.arrayContaining([
          mockExistingItem,
          expect.objectContaining({
            linkId: 'release',
            answer: [{ valueBoolean: false }],
          }),
          expect.objectContaining({
            linkId: 'extended-extraction-period',
            answer: [{ valueString: extendPeriod }],
          }),
        ]),
      });

      expect(apiClientMock.put).toHaveBeenCalledWith(`/QuestionnaireResponse/${mockQResponseId}`, expectedPayload);
    });

    it('should throw an error if the PUT request fails', async () => {
      jest.spyOn(service, 'getQuetionnairResponseReleaseConsolidateDataSets').mockResolvedValue(mockQResponse as any);
      apiClientMock.put.mockRejectedValue(new Error('Update failed'));

      await expect(service.setReleaseConsolidateDataSetsAnswer(mockBusinessKey, false)).rejects.toThrow(
        'Update failed',
      );
    });
  });
});
