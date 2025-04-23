import { NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { plainToClass } from 'class-transformer';
import { Model } from 'mongoose';
import { ProposalTypeOfUse } from 'src/modules/proposal/enums/proposal-type-of-use.enum';
import { NoErrorThrownError, getError } from 'test/get-error';
import { AdminConfigService } from '../admin-config.service';
import { DataPrivacyConfigCreateDto } from '../dto/data-privacy/data-privacy-config.dto';
import { ConfigType } from '../enums/config-type.enum';
import { PlatformIdentifier } from '../enums/platform-identifier.enum';
import { DataPrivacyConfigDocument } from '../schema/data-privacy/data-privacy-config.schema';
import { TermsConfig, TermsConfigDocument } from '../schema/terms/terms-config.schema';

jest.mock('class-transformer', () => {
  const original = jest.requireActual('class-transformer');
  return {
    ...original,
    plainToClass: jest.fn(),
  };
});
const plainToClassMock = jest.mocked(plainToClass);

describe('AdminConfigService', () => {
  let service: AdminConfigService;
  let termsConfigModel: Model<TermsConfigDocument>;
  let dataPrivacyModel: Model<DataPrivacyConfigDocument>;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminConfigService,
        {
          provide: getModelToken('TermsConfig'),
          useValue: {
            new: jest.fn().mockImplementation((data) => Promise.resolve(data)),
            constructor: jest.fn().mockImplementation((data) => Promise.resolve(data)),
            findOne: jest.fn(),
            updateOne: jest.fn(),
          },
        },
        {
          provide: getModelToken('DataPrivacyConfig'),
          useValue: {
            new: jest.fn().mockImplementation((data) => Promise.resolve(data)),
            constructor: jest.fn().mockImplementation((data) => Promise.resolve(data)),
            findOne: jest.fn(),
            updateOne: jest.fn(),
          },
        },
      ],
      imports: [],
    }).compile();

    service = module.get<AdminConfigService>(AdminConfigService);
    termsConfigModel = module.get<Model<TermsConfigDocument>>(getModelToken('TermsConfig'));
    dataPrivacyModel = module.get<Model<DataPrivacyConfigDocument>>(getModelToken('DataPrivacyConfig'));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findTermsConfig', () => {
    it('should call the db to find the terms config for the desired platform', async () => {
      const toObject = jest.fn().mockImplementation();
      jest.spyOn(termsConfigModel, 'findOne').mockResolvedValueOnce({
        toObject,
      });
      const out = { test: 'value' };
      plainToClassMock.mockReturnValue(out);

      const result = await service.findTermsConfig(PlatformIdentifier.Mii);

      const filter = { type: ConfigType.TermsDialog, platform: PlatformIdentifier.Mii };
      expect(termsConfigModel.findOne).toBeCalledWith(filter);
      expect(toObject).toBeCalledTimes(1);
      expect(result).toEqual(out);
    });

    it('should throw if not found', async () => {
      jest.spyOn(termsConfigModel, 'findOne').mockResolvedValueOnce(undefined);
      const dbCall = service.findTermsConfig(PlatformIdentifier.Mii);
      const error = await getError(async () => await dbCall);

      expect(error).toBeDefined();
      expect(error).not.toBeInstanceOf(NoErrorThrownError);
      expect(error).toBeInstanceOf(NotFoundException);
    });
  });

  describe('updateTermsConfig', () => {
    it('should call the db to update the terms config for the desired platform', async () => {
      jest.spyOn(termsConfigModel, 'updateOne').mockResolvedValue(undefined);

      const termsConfig: Partial<TermsConfig> = {
        terms: [
          {
            label: 'test',
            slots: [],
          },
        ],
      };
      await service.updateTermsConfig(PlatformIdentifier.Mii, termsConfig);

      const filter = { type: ConfigType.TermsDialog, platform: PlatformIdentifier.Mii };
      expect(termsConfigModel.updateOne).toBeCalledTimes(1);
      expect(termsConfigModel.updateOne).toHaveBeenCalledWith(
        filter,
        expect.objectContaining({
          $set: {
            ...termsConfig,
            ...filter,
          },
        }),
        { upsert: true },
      );
    });
  });

  describe('getDataPrivacyConfig', () => {
    it('should call the db to find the data privacy config for the desired platform', async () => {
      const toObject = jest.fn().mockImplementation();
      jest.spyOn(dataPrivacyModel, 'findOne').mockResolvedValueOnce({
        toObject,
      });
      const out = { test: 'value' };
      plainToClassMock.mockReturnValue(out);

      const result = await service.getDataPrivacyConfig(PlatformIdentifier.Mii);

      const filter = { type: ConfigType.DataPrivacy, platform: PlatformIdentifier.Mii };
      expect(dataPrivacyModel.findOne).toBeCalledWith(filter);
      expect(toObject).toBeCalledTimes(1);
      expect(result).toEqual(out);
    });

    it('should throw if not found', async () => {
      jest.spyOn(dataPrivacyModel, 'findOne').mockResolvedValueOnce(undefined);
      const dbCall = service.getDataPrivacyConfig(PlatformIdentifier.Mii);
      const error = await getError(async () => await dbCall);

      expect(error).toBeDefined();
      expect(error).not.toBeInstanceOf(NoErrorThrownError);
      expect(error).toBeInstanceOf(NotFoundException);
    });
  });

  describe('updateDataPrivacyConfig', () => {
    it('should call the db to update the data privacy config for the desired platform', async () => {
      jest.spyOn(dataPrivacyModel, 'updateOne').mockResolvedValue(undefined);

      const dataPrivacyConfig: DataPrivacyConfigCreateDto = {
        messages: {
          [ProposalTypeOfUse.Biosample]: {
            headline: {
              en: 'testEN',
              de: 'testDE',
            },
            text: {
              en: 'testEN',
              de: 'testDE',
            },
          },
          [ProposalTypeOfUse.Distributed]: {
            headline: {
              en: 'testEN',
              de: 'testDE',
            },
            text: {
              en: 'testEN',
              de: 'testDE',
            },
          },
          [ProposalTypeOfUse.Centralized]: {
            headline: {
              en: 'testEN',
              de: 'testDE',
            },
            text: {
              en: 'testEN',
              de: 'testDE',
            },
          },
        },
      };
      await service.updateDataPrivacyConfig(PlatformIdentifier.Mii, dataPrivacyConfig);

      const filter = { type: ConfigType.DataPrivacy, platform: PlatformIdentifier.Mii };
      expect(dataPrivacyModel.updateOne).toBeCalledTimes(1);
      expect(dataPrivacyModel.updateOne).toHaveBeenCalledWith(filter, expect.anything(), { upsert: true });
    });
  });

  describe('getDataSources', () => {
    it('should return an array of data sources', async () => {
      const result = await service.getDataSources();

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('_id');
      expect(result[0]).toHaveProperty('tag', PlatformIdentifier.DIFE);
      expect(result[0]).toHaveProperty('title', 'proposal.dife_title');
      expect(result[0]).toHaveProperty('description', 'proposal.dife_description');
      expect(result[0]).toHaveProperty('externalLink', 'proposal.dife_link');

      expect(result[1]).toHaveProperty('_id');
      expect(result[1]).toHaveProperty('tag', PlatformIdentifier.Mii);
      expect(result[1]).toHaveProperty('title', 'proposal.mii_title');
      expect(result[1]).toHaveProperty('description', 'proposal.mii_description');
      expect(result[1]).toHaveProperty('externalLink', 'proposal.mii_link');
    });
  });
});
