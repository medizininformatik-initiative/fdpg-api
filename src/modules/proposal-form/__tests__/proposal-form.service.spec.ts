import { Test, TestingModule } from '@nestjs/testing';
import { ProposalFormService } from '../proposal-form.service';
import { getModelToken } from '@nestjs/mongoose';
import { ProposalForm } from '../schema/proposal-form.schema';
import { NotFoundException } from '@nestjs/common';
import { ProposalType } from '../../proposal/enums/proposal-type.enum';
import { Proposal } from '../../proposal/schema/proposal.schema';

describe('ProposalFormService', () => {
  let service: ProposalFormService;
  let mockProposalFormModel: any;

  const mockProposalFormData = [
    {
      _id: 'form1',
      formVersion: 1,
      formSchema: {
        field1: { type: 'textfield' },
        field2: { type: 'datepicker' },
      },
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    {
      _id: 'form2',
      formVersion: 2,
      formSchema: {
        field1: { type: 'textfield' },
        nestedField: {
          subField1: { type: 'richtext' },
        },
      },
      createdAt: new Date('2024-02-01'),
      updatedAt: new Date('2024-02-01'),
    },
    {
      _id: 'form3',
      formVersion: 3,
      formSchema: {
        field1: { type: 'textfield' },
        arrayField: [
          {
            item1: { type: 'checkbox' },
          },
        ],
      },
      createdAt: new Date('2024-03-01'),
      updatedAt: new Date('2024-03-01'),
    },
  ];

  beforeEach(async () => {
    mockProposalFormModel = {
      find: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockProposalFormData),
      }),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProposalFormService,
        {
          provide: getModelToken(ProposalForm.name),
          useValue: mockProposalFormModel,
        },
      ],
    }).compile();

    service = module.get<ProposalFormService>(ProposalFormService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    service['currentVersion'] = undefined;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all proposal forms', async () => {
      const result = await service.findAll();

      expect(mockProposalFormModel.find).toHaveBeenCalledWith({});
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(3);
    });
  });

  describe('getCurrentVersion', () => {
    it('should return the maximum version number', async () => {
      const result = await service.getCurrentVersion();

      expect(result).toBe(3);
      expect(mockProposalFormModel.find).toHaveBeenCalledWith({});
    });

    it('should cache the current version and not fetch again', async () => {
      const result1 = await service.getCurrentVersion();
      const result2 = await service.getCurrentVersion();

      expect(result1).toBe(3);
      expect(result2).toBe(3);
      expect(mockProposalFormModel.find).toHaveBeenCalledTimes(1);
    });

    it('should return 0 when no forms exist', async () => {
      mockProposalFormModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });

      const result = await service.getCurrentVersion();

      expect(result).toBe(0);
    });
  });

  describe('findMostRecentProposalForm', () => {
    it('should return the most recent proposal form', async () => {
      const mockForm = {
        ...mockProposalFormData[2],
        toObject: jest.fn().mockReturnValue(mockProposalFormData[2]),
      };

      mockProposalFormModel.findOne.mockResolvedValue(mockForm);

      const result = await service.findMostRecentProposalForm();

      expect(result).toEqual(mockForm);
      expect(mockProposalFormModel.findOne).toHaveBeenCalledWith({ formVersion: 3 });
    });

    it('should throw NotFoundException when no form is found', async () => {
      mockProposalFormModel.findOne.mockResolvedValue(null);

      await expect(service.findMostRecentProposalForm()).rejects.toThrow(NotFoundException);
      await expect(service.findMostRecentProposalForm()).rejects.toThrow(
        'Cannot find most current form with version 3',
      );
    });
  });

  describe('getProposalUiFields', () => {
    it('should throw error for non-ApplicationForm proposal types', async () => {
      const proposal = {
        _id: 'proposal1',
        type: ProposalType.RegisteringForm,
        formVersion: 2,
      } as Proposal;

      await expect(service.getProposalUiFields(proposal)).rejects.toThrow(
        `Proposal Application Forms Schemas cannot be applied to ${ProposalType.RegisteringForm}`,
      );
    });

    it('should map form schema to proposal values', async () => {
      const mockForm = {
        ...mockProposalFormData[1],
        toObject: jest.fn().mockReturnValue(mockProposalFormData[1]),
      };

      mockProposalFormModel.findOne.mockResolvedValue(mockForm);

      const proposal = {
        _id: 'proposal1',
        type: ProposalType.ApplicationForm,
        formVersion: 2,
        field1: 'Test Value',
        nestedField: {
          subField1: 'Nested Value',
        },
      } as unknown as Proposal;

      const result = await service.getProposalUiFields(proposal);

      expect(result.proposalId).toBe('proposal1');
      expect(result.formVersion).toBe(2);
      expect(result.proposalFormValues).toBeDefined();
      expect(result.proposalFormValues.field1).toEqual({
        type: 'textfield',
        value: 'Test Value',
      });
      expect(result.proposalFormValues.nestedField.subField1).toEqual({
        type: 'richtext',
        value: 'Nested Value',
      });
    });

    it('should handle proposals with empty arrays', async () => {
      const mockForm = {
        ...mockProposalFormData[2],
        toObject: jest.fn().mockReturnValue(mockProposalFormData[2]),
      };

      mockProposalFormModel.findOne.mockResolvedValue(mockForm);

      const proposal = {
        _id: 'proposal1',
        type: ProposalType.ApplicationForm,
        formVersion: 3,
        field1: 'Test Value',
        arrayField: [],
      } as unknown as Proposal;

      const result = await service.getProposalUiFields(proposal);

      expect(result.proposalFormValues.arrayField).toEqual([]);
    });

    it('should handle missing proposal values with null', async () => {
      const mockForm = {
        ...mockProposalFormData[1],
        toObject: jest.fn().mockReturnValue(mockProposalFormData[1]),
      };

      mockProposalFormModel.findOne.mockResolvedValue(mockForm);

      const proposal = {
        _id: 'proposal1',
        type: ProposalType.ApplicationForm,
        formVersion: 2,
      } as unknown as Proposal;

      const result = await service.getProposalUiFields(proposal);

      expect(result.proposalFormValues.field1).toEqual({
        type: 'textfield',
        value: null,
      });
      expect(result.proposalFormValues.nestedField).toBeNull();
    });
  });

  describe('getProposalUiSchema', () => {
    it('should return a schema object', () => {
      const result = service.getProposalUiSchema();

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });
  });
});
