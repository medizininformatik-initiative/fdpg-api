import { Test, TestingModule } from '@nestjs/testing';
import { FhirService } from '../fhir.service';
import { ConfigService } from '@nestjs/config';
import { DsfQuestionnaireResponseService } from '../dsf-questionnaire-response/dsf-questionnaire-response.service';
import { DsfTaskService } from '../dsf-task/dsf-task.service';
import { FhirHelpersUtil } from '../util/fhir-helpers.util';
import { Logger } from '@nestjs/common';

// 1. Mock External Dependencies
jest.mock('uuid', () => ({ v4: () => 'MOCK-UUID-123' }));
jest.mock('../util/fhir-helpers.util');

describe('FhirService', () => {
  let service: FhirService;
  let taskService: DsfTaskService;
  let questionnaireService: DsfQuestionnaireResponseService;
  let configService: ConfigService;

  // Dummy Data
  const mockDms = { uri: 'http://dms.com', name: 'DMS' } as any;
  const mockDicLocations = [{ uri: 'http://dic1.com', name: 'DIC1' }] as any;
  const mockResearcherMails = ['test@researcher.com'];
  const mockDate = new Date('2024-01-01');

  beforeEach(async () => {
    // 2. Setup Module
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FhirService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              if (key === 'FRONTEND_URL') return 'http://frontend.com';
              if (key === 'IS_FHIR_TEST') return 'false';
              return defaultValue;
            }),
          },
        },
        {
          provide: DsfTaskService,
          useValue: {
            startCoordinateDataSharingProcess: jest.fn(),
            pollForReceivedDataSetsByBusinessKey: jest.fn(),
            getResultUrlByTaskId: jest.fn(),
          },
        },
        {
          provide: DsfQuestionnaireResponseService,
          useValue: {
            setReleaseConsolidateDataSetsAnswer: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<FhirService>(FhirService);
    taskService = module.get<DsfTaskService>(DsfTaskService);
    questionnaireService = module.get<DsfQuestionnaireResponseService>(DsfQuestionnaireResponseService);
    configService = module.get<ConfigService>(ConfigService);

    // Silence Logger
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});

    jest.clearAllMocks();
  });

  describe('createCoordinateDataSharingTask', () => {
    it('should create task with correct parameters in production mode', async () => {
      // Arrange
      const mockExtractionPeriod = 'P1M';
      (FhirHelpersUtil.getExtractionPeriod as jest.Mock).mockReturnValue(mockExtractionPeriod);

      const mockTaskResponse = { id: 'TASK-123' };
      (taskService.startCoordinateDataSharingProcess as jest.Mock).mockResolvedValue(mockTaskResponse);

      // Act
      const result = await service.createCoordinateDataSharingTask(
        'prop-1',
        'PROJ',
        mockDms,
        mockDicLocations,
        mockResearcherMails,
        mockDate,
      );

      // Assert
      expect(FhirHelpersUtil.getExtractionPeriod).toHaveBeenCalled();

      // REMOVED 'dateTime' from expected object below
      expect(taskService.startCoordinateDataSharingProcess).toHaveBeenCalledWith({
        hrpOrganizationIdentifier: 'forschen-fuer-gesundheit.de',
        projectIdentifier: 'PROJ',
        contractUrl: 'http://frontend.com/proposals/prop-1/details',
        dmsIdentifier: 'http://dms.com',
        researcherIdentifiers: ['test@researcher.com'],
        dicIdentifiers: ['http://dic1.com'],
        extractionPeriod: mockExtractionPeriod,
        businessKey: 'MOCK-UUID-123',
      });

      expect(result).toEqual({
        fhirBusinessKey: 'MOCK-UUID-123',
        fhirTaskId: 'TASK-123',
      });
    });

    it('should override identifiers if FHIR testing is enabled', async () => {
      // Arrange
      // Re-create service with IS_FHIR_TEST = true
      jest.spyOn(configService, 'get').mockImplementation((key) => {
        if (key === 'IS_FHIR_TEST') return 'true';
        return 'http://frontend.com';
      });

      // We need to reinstantiate because the constructor reads the config
      const module = await Test.createTestingModule({
        providers: [
          FhirService,
          { provide: ConfigService, useValue: configService },
          { provide: DsfTaskService, useValue: taskService },
          { provide: DsfQuestionnaireResponseService, useValue: questionnaireService },
        ],
      }).compile();
      const serviceTestMode = module.get<FhirService>(FhirService);

      (taskService.startCoordinateDataSharingProcess as jest.Mock).mockResolvedValue({ id: 'TASK-TEST' });

      // Act
      await serviceTestMode.createCoordinateDataSharingTask('prop-1', 'PROJ', mockDms, mockDicLocations, [], mockDate);

      // Assert
      expect(taskService.startCoordinateDataSharingProcess).toHaveBeenCalledWith(
        expect.objectContaining({
          dmsIdentifier: 'dms.test.forschen-fuer-gesundheit.de',
          projectIdentifier: 'Test_PROJECT_NDJSON_TXT',
          dicIdentifiers: ['diz-1.test.fdpg.forschen-fuer-gesundheit.de'],
        }),
      );
      expect(Logger.prototype.warn).toHaveBeenCalledWith(expect.stringContaining('FHIR TESTING IS ENABLED'));
    });
  });

  describe('pollForReceivedDataSetsByBusinessKey', () => {
    it('should delegate to taskService', async () => {
      const mockResult = [{ id: 'ds-1' }];
      (taskService.pollForReceivedDataSetsByBusinessKey as jest.Mock).mockResolvedValue(mockResult);

      const result = await service.pollForReceivedDataSetsByBusinessKey('BK-123', mockDate);

      expect(taskService.pollForReceivedDataSetsByBusinessKey).toHaveBeenCalledWith('BK-123', mockDate);
      expect(result).toBe(mockResult);
    });
  });

  describe('extendQuestionnairResponseReleaseConsolidateDataSets', () => {
    it('should calculate period and call questionnaire service with extend=true', async () => {
      const mockPeriod = 'P14D';
      (FhirHelpersUtil.getExtractionPeriod as jest.Mock).mockReturnValue(mockPeriod);

      await service.extendQuestionnairResponseReleaseConsolidateDataSets('BK-123', mockDate);

      expect(FhirHelpersUtil.getExtractionPeriod).toHaveBeenCalled();
      expect(questionnaireService.setReleaseConsolidateDataSetsAnswer).toHaveBeenCalledWith('BK-123', true, mockPeriod);
    });
  });

  describe('releaseQuestionnairResponseReleaseConsolidateDataSets', () => {
    it('should call questionnaire service with extend=false', async () => {
      await service.releaseQuestionnairResponseReleaseConsolidateDataSets('BK-123');

      expect(questionnaireService.setReleaseConsolidateDataSetsAnswer).toHaveBeenCalledWith('BK-123', false);
    });
  });

  describe('fetchResultUrl', () => {
    it('should return null if service returns undefined', async () => {
      (taskService.getResultUrlByTaskId as jest.Mock).mockResolvedValue(undefined);
      const result = await service.fetchResultUrl('TASK-1');
      expect(result).toBeNull();
    });

    it('should return null if service returns empty string', async () => {
      (taskService.getResultUrlByTaskId as jest.Mock).mockResolvedValue('   ');
      const result = await service.fetchResultUrl('TASK-1');
      expect(result).toBeNull();
    });

    it('should return url if service returns valid string', async () => {
      const validUrl = 'http://result.com/data.zip';
      (taskService.getResultUrlByTaskId as jest.Mock).mockResolvedValue(validUrl);

      const result = await service.fetchResultUrl('TASK-1');
      expect(result).toBe(validUrl);
    });
  });
});
