import { ArgumentMetadata } from '@nestjs/common';
import { validate } from 'class-validator';
import { ProposalValidationPipe } from '../validation.pipe';
import { ValidationException } from 'src/exceptions/validation/validation.exception';
import { ProposalBaseDto } from '../dto/proposal/proposal.dto';
import { ProposalStatus } from '../enums/proposal-status.enum';
import { ProposalType } from '../enums/proposal-type.enum';
import { ProposalTypeOfUse } from '../enums/proposal-type-of-use.enum';
import { PlatformIdentifier } from '../../admin/enums/platform-identifier.enum';
import { MongoIdParamDto } from 'src/shared/dto/mongo-id-param.dto';
import { ProposalValidation } from '../enums/porposal-validation.enum';
import { FileDto } from 'src/shared/dto/file.dto';

jest.mock('class-validator', () => ({
  ...jest.requireActual('class-validator'),
  validate: jest.fn(),
}));

describe('ProposalValidationPipe', () => {
  let pipe: ProposalValidationPipe;
  let creationPipe: ProposalValidationPipe;

  beforeEach(() => {
    pipe = new ProposalValidationPipe(false);
    creationPipe = new ProposalValidationPipe(true);
    jest.clearAllMocks();
    (validate as jest.Mock).mockResolvedValue([]);
  });

  describe('getValidationGroups (via spy)', () => {
    it('should include Default group for all cases', () => {
      const getValidationGroupsSpy = jest.spyOn(pipe as any, 'getValidationGroups');

      const proposal = new ProposalBaseDto();
      proposal.status = ProposalStatus.Draft;

      (pipe as any).getValidationGroups(proposal);

      const groups = getValidationGroupsSpy.mock.results[0].value;
      expect(groups).toContain(ProposalValidation.Default);

      getValidationGroupsSpy.mockRestore();
    });

    it('should include IsNotCreation group when isCreation is false', () => {
      const getValidationGroupsSpy = jest.spyOn(pipe as any, 'getValidationGroups');

      const proposal = new ProposalBaseDto();
      proposal.status = ProposalStatus.Draft;

      (pipe as any).getValidationGroups(proposal);

      const groups = getValidationGroupsSpy.mock.results[0].value;
      expect(groups).toContain(ProposalValidation.IsNotCreation);

      getValidationGroupsSpy.mockRestore();
    });

    it('should not include IsNotCreation group when isCreation is true', () => {
      const getValidationGroupsSpy = jest.spyOn(creationPipe as any, 'getValidationGroups');

      const proposal = new ProposalBaseDto();
      proposal.status = ProposalStatus.Draft;

      (creationPipe as any).getValidationGroups(proposal);

      const groups = getValidationGroupsSpy.mock.results[0].value;
      expect(groups).not.toContain(ProposalValidation.IsNotCreation);

      getValidationGroupsSpy.mockRestore();
    });

    it('should include IsDraft and no IsNotDraft for Draft status', () => {
      const proposal = new ProposalBaseDto();
      proposal.status = ProposalStatus.Draft;

      const groups = (pipe as any).getValidationGroups(proposal);

      expect(groups).toContain(ProposalValidation.IsDraft);
      expect(groups).not.toContain(ProposalValidation.IsNotDraft);
    });

    it('should include IsNotDraft for non-Draft status', () => {
      const proposal = new ProposalBaseDto();
      proposal.status = ProposalStatus.Published;

      const groups = (pipe as any).getValidationGroups(proposal);

      expect(groups).toContain(ProposalValidation.IsNotDraft);
      expect(groups).not.toContain(ProposalValidation.IsDraft);
    });

    it('should include IsRework for Rework status', () => {
      const proposal = new ProposalBaseDto();
      proposal.status = ProposalStatus.Rework;

      const groups = (pipe as any).getValidationGroups(proposal);

      expect(groups).toContain(ProposalValidation.IsRework);
      expect(groups).toContain(ProposalValidation.IsNotDraft);
    });

    it('should include IsBiosampleType when Biosample is in usage', () => {
      const proposal = new ProposalBaseDto();
      proposal.status = ProposalStatus.Published;
      proposal.userProject = {
        typeOfUse: {
          usage: [ProposalTypeOfUse.Biosample],
        },
      } as any;

      const groups = (pipe as any).getValidationGroups(proposal);

      expect(groups).toContain(ProposalValidation.IsBiosampleType);
    });

    it('should not include IsBiosampleType when Biosample is not in usage', () => {
      const proposal = new ProposalBaseDto();
      proposal.status = ProposalStatus.Published;
      proposal.userProject = {
        typeOfUse: {
          usage: [],
        },
      } as any;

      const groups = (pipe as any).getValidationGroups(proposal);

      expect(groups).not.toContain(ProposalValidation.IsBiosampleType);
    });

    it('should include IsDIFEDataSource when DIFE is selected', () => {
      const proposal = new ProposalBaseDto();
      proposal.status = ProposalStatus.Published;
      proposal.selectedDataSources = [PlatformIdentifier.DIFE];

      const groups = (pipe as any).getValidationGroups(proposal);

      expect(groups).toContain(ProposalValidation.IsDIFEDataSource);
    });

    it('should include IsMiiDataSource when MII is selected', () => {
      const proposal = new ProposalBaseDto();
      proposal.status = ProposalStatus.Published;
      proposal.selectedDataSources = [PlatformIdentifier.Mii];

      const groups = (pipe as any).getValidationGroups(proposal);

      expect(groups).toContain(ProposalValidation.IsMiiDataSource);
    });

    it('should include both data source groups when both DIFE and MII are selected', () => {
      const proposal = new ProposalBaseDto();
      proposal.status = ProposalStatus.Published;
      proposal.selectedDataSources = [PlatformIdentifier.DIFE, PlatformIdentifier.Mii];

      const groups = (pipe as any).getValidationGroups(proposal);

      expect(groups).toContain(ProposalValidation.IsDIFEDataSource);
      expect(groups).toContain(ProposalValidation.IsMiiDataSource);
    });

    it('should include IsRegister for RegisteringForm type', () => {
      const proposal = new ProposalBaseDto();
      proposal.status = ProposalStatus.Published;
      proposal.type = ProposalType.RegisteringForm;

      const groups = (pipe as any).getValidationGroups(proposal);

      expect(groups).toContain(ProposalValidation.IsRegister);
      expect(groups).not.toContain(ProposalValidation.IsNotDraftAndNotRegister);
    });

    it('should include IsNotDraftAndNotRegister for non-register, non-draft proposals', () => {
      const proposal = new ProposalBaseDto();
      proposal.status = ProposalStatus.Published;
      proposal.type = ProposalType.ApplicationForm;

      const groups = (pipe as any).getValidationGroups(proposal);

      expect(groups).toContain(ProposalValidation.IsNotDraftAndNotRegister);
      expect(groups).not.toContain(ProposalValidation.IsRegister);
    });

    it('should return early for MongoIdParamDto', () => {
      const mongoId = new MongoIdParamDto();

      const groups = (pipe as any).getValidationGroups(mongoId);

      expect(groups).toContain(ProposalValidation.Default);
      expect(groups).toContain(ProposalValidation.IsNotCreation);
      expect(groups.length).toBe(2);
    });

    it('should handle undefined selectedDataSources', () => {
      const proposal = new ProposalBaseDto();
      proposal.status = ProposalStatus.Published;
      proposal.selectedDataSources = undefined;

      const groups = (pipe as any).getValidationGroups(proposal);

      expect(groups).not.toContain(ProposalValidation.IsDIFEDataSource);
      expect(groups).not.toContain(ProposalValidation.IsMiiDataSource);
    });

    it('should handle undefined userProject', () => {
      const proposal = new ProposalBaseDto();
      proposal.status = ProposalStatus.Published;
      proposal.userProject = undefined;

      const groups = (pipe as any).getValidationGroups(proposal);

      expect(groups).not.toContain(ProposalValidation.IsBiosampleType);
    });

    it('should handle undefined typeOfUse in userProject', () => {
      const proposal = new ProposalBaseDto();
      proposal.status = ProposalStatus.Published;
      proposal.userProject = {
        typeOfUse: undefined,
      } as any;

      const groups = (pipe as any).getValidationGroups(proposal);

      expect(groups).not.toContain(ProposalValidation.IsBiosampleType);
    });

    it('should handle undefined usage in typeOfUse', () => {
      const proposal = new ProposalBaseDto();
      proposal.status = ProposalStatus.Published;
      proposal.userProject = {
        typeOfUse: {
          usage: undefined,
        },
      } as any;

      const groups = (pipe as any).getValidationGroups(proposal);

      expect(groups).not.toContain(ProposalValidation.IsBiosampleType);
    });

    it('should handle empty data sources array', () => {
      const proposal = new ProposalBaseDto();
      proposal.status = ProposalStatus.Published;
      proposal.selectedDataSources = [];

      const groups = (pipe as any).getValidationGroups(proposal);

      expect(groups).not.toContain(ProposalValidation.IsDIFEDataSource);
      expect(groups).not.toContain(ProposalValidation.IsMiiDataSource);
    });

    it('should return only Default and IsDraft for Draft proposals', () => {
      const proposal = new ProposalBaseDto();
      proposal.status = ProposalStatus.Draft;

      const groups = (pipe as any).getValidationGroups(proposal);

      expect(groups).toContain(ProposalValidation.Default);
      expect(groups).toContain(ProposalValidation.IsNotCreation);
      expect(groups).toContain(ProposalValidation.IsDraft);
      expect(groups).not.toContain(ProposalValidation.IsNotDraft);
      expect(groups.length).toBe(3); // Default, IsNotCreation, IsDraft
    });

    it('should handle complex proposal with multiple validation groups', () => {
      const proposal = new ProposalBaseDto();
      proposal.status = ProposalStatus.Published;
      proposal.type = ProposalType.ApplicationForm;
      proposal.selectedDataSources = [PlatformIdentifier.DIFE, PlatformIdentifier.Mii];
      proposal.userProject = {
        typeOfUse: {
          usage: [ProposalTypeOfUse.Biosample],
        },
      } as any;

      const groups = (pipe as any).getValidationGroups(proposal);

      expect(groups).toContain(ProposalValidation.Default);
      expect(groups).toContain(ProposalValidation.IsNotCreation);
      expect(groups).toContain(ProposalValidation.IsNotDraft);
      expect(groups).toContain(ProposalValidation.IsBiosampleType);
      expect(groups).toContain(ProposalValidation.IsDIFEDataSource);
      expect(groups).toContain(ProposalValidation.IsMiiDataSource);
      expect(groups).toContain(ProposalValidation.IsNotDraftAndNotRegister);
    });
  });

  describe('transform', () => {
    const createMetadata = (type: any): ArgumentMetadata => ({
      type: 'body',
      metatype: type,
      data: '',
    });

    it('should return transformed object when no validation errors', async () => {
      (validate as jest.Mock).mockResolvedValue([]);

      const proposal = {
        projectAbbreviation: 'TEST-001',
        status: ProposalStatus.Draft,
      };

      const result = await pipe.transform(proposal, createMetadata(ProposalBaseDto));

      expect(result).toBeDefined();
      expect(validate).toHaveBeenCalled();
    });

    it('should throw ValidationException when there are validation errors', async () => {
      const mockError = {
        property: 'projectAbbreviation',
        constraints: { isNotEmpty: 'should not be empty' },
        target: new ProposalBaseDto(),
      };

      (validate as jest.Mock).mockResolvedValue([mockError]);

      const proposal = {
        projectAbbreviation: '',
        status: ProposalStatus.Draft,
      };

      await expect(pipe.transform(proposal, createMetadata(ProposalBaseDto))).rejects.toThrow(ValidationException);
    });

    it('should filter out FileDto errors and return object if all remaining errors are FileDto', async () => {
      const fileDto = new FileDto();
      const mockError = {
        property: 'file',
        constraints: { isNotEmpty: 'should not be empty' },
        target: fileDto,
      };

      (validate as jest.Mock).mockResolvedValue([mockError]);

      const proposal = {
        projectAbbreviation: 'TEST-002',
        status: ProposalStatus.Draft,
      };

      const result = await pipe.transform(proposal, createMetadata(ProposalBaseDto));

      expect(result).toBeDefined();
    });

    it('should filter out FileDto errors in array targets', async () => {
      const fileDto = new FileDto();
      const mockError = {
        property: 'files',
        constraints: { isNotEmpty: 'should not be empty' },
        target: [fileDto],
      };

      (validate as jest.Mock).mockResolvedValue([mockError]);

      const proposal = {
        projectAbbreviation: 'TEST-003',
        status: ProposalStatus.Draft,
      };

      const result = await pipe.transform(proposal, createMetadata(ProposalBaseDto));

      expect(result).toBeDefined();
    });

    it('should throw ValidationException when non-FileDto errors exist in array', async () => {
      const mockTarget = new ProposalBaseDto();
      const mockError = {
        property: 'items',
        constraints: { isNotEmpty: 'should not be empty' },
        target: [mockTarget],
      };

      (validate as jest.Mock).mockResolvedValue([mockError]);

      const proposal = {
        projectAbbreviation: 'TEST-004',
        status: ProposalStatus.Draft,
      };

      await expect(pipe.transform(proposal, createMetadata(ProposalBaseDto))).rejects.toThrow(ValidationException);
    });

    it('should throw ValidationException when mixed FileDto and non-FileDto errors exist', async () => {
      const fileDto = new FileDto();
      const proposalDto = new ProposalBaseDto();

      const fileDtoError = {
        property: 'file',
        constraints: { isNotEmpty: 'should not be empty' },
        target: fileDto,
      };

      const proposalError = {
        property: 'projectAbbreviation',
        constraints: { isNotEmpty: 'should not be empty' },
        target: proposalDto,
      };

      (validate as jest.Mock).mockResolvedValue([fileDtoError, proposalError]);

      const proposal = {
        projectAbbreviation: '',
        status: ProposalStatus.Draft,
      };

      await expect(pipe.transform(proposal, createMetadata(ProposalBaseDto))).rejects.toThrow(ValidationException);
    });

    it('should call getValidationGroups twice during transform', async () => {
      (validate as jest.Mock).mockResolvedValue([]);

      const getValidationGroupsSpy = jest.spyOn(pipe as any, 'getValidationGroups');

      const proposal = {
        projectAbbreviation: 'TEST-005',
        status: ProposalStatus.Draft,
      };

      await pipe.transform(proposal, createMetadata(ProposalBaseDto));

      expect(getValidationGroupsSpy).toHaveBeenCalledTimes(2);

      getValidationGroupsSpy.mockRestore();
    });
  });
});
