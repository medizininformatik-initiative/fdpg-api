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
import { AlertConfigDocument } from '../schema/alert/alert-config.schema';
import { StorageService } from '../../storage/storage.service';

jest.mock('class-transformer', () => {
  const original = jest.requireActual('class-transformer');
  return {
    ...original,
    plainToClass: jest.fn((cls, obj) => {
      if (cls.name === 'AlertConfigGetDto') {
        return {
          logoBase64: obj.logoBase64,
          isVisible: obj.isVisible || false,
          message: obj.message || '',
          type: ConfigType.Alert,
        };
      }
      return obj;
    }),
  };
});
const plainToClassMock = jest.mocked(plainToClass);

describe('AdminConfigService', () => {
  let service: AdminConfigService;
  let termsConfigModel: Model<TermsConfigDocument>;
  let dataPrivacyModel: Model<DataPrivacyConfigDocument>;
  let alertConfigModel: Model<AlertConfigDocument>;

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
        {
          provide: getModelToken('AlertConfig'),
          useValue: {
            new: jest.fn().mockImplementation((data) => Promise.resolve(data)),
            constructor: jest.fn().mockImplementation((data) => Promise.resolve(data)),
            findOne: jest.fn(),
            updateOne: jest.fn(),
          },
        },
        {
          provide: StorageService,
          useValue: {
            uploadFile: jest.fn(),
            getSasUrl: jest.fn(),
            deleteBlob: jest.fn(),
          },
        },
      ],
      imports: [],
    }).compile();

    service = module.get<AdminConfigService>(AdminConfigService);
    termsConfigModel = module.get<Model<TermsConfigDocument>>(getModelToken('TermsConfig'));
    dataPrivacyModel = module.get<Model<DataPrivacyConfigDocument>>(getModelToken('DataPrivacyConfig'));
    alertConfigModel = module.get<Model<AlertConfigDocument>>(getModelToken('AlertConfig'));
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
            headline: 'test',
            text: 'test',
          },
          [ProposalTypeOfUse.Distributed]: {
            headline: 'test',
            text: 'test',
          },
          [ProposalTypeOfUse.Centralized]: {
            headline: 'test',
            text: 'test',
          },
          all: {
            headline: 'test',
            text: 'test',
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
    it('should return available data sources', async () => {
      const result = await service.getDataSources();

      expect(result).toHaveProperty(PlatformIdentifier.DIFE);
      expect(result).toHaveProperty(PlatformIdentifier.Mii);

      expect(result[PlatformIdentifier.DIFE]).toHaveProperty('title', 'proposal.dife_title');
      expect(result[PlatformIdentifier.DIFE]).toHaveProperty('description', 'proposal.dife_description');
      expect(result[PlatformIdentifier.DIFE]).toHaveProperty('externalLink', 'proposal.dife_link');

      expect(result[PlatformIdentifier.Mii]).toHaveProperty('title', 'proposal.mii_title');
      expect(result[PlatformIdentifier.Mii]).toHaveProperty('description', 'proposal.mii_description');
      expect(result[PlatformIdentifier.Mii]).toHaveProperty('externalLink', 'proposal.mii_link');
    });
  });

  describe('getAlertConfig', () => {
    it('should call the db to find the alert config', async () => {
      const toObject = jest.fn().mockImplementation();
      jest.spyOn(alertConfigModel, 'findOne').mockResolvedValueOnce({
        toObject,
      });
      const out = { test: 'value' };
      plainToClassMock.mockReturnValue(out);

      const result = await service.getAlertConfig();

      const filter = { type: ConfigType.Alert };
      expect(alertConfigModel.findOne).toBeCalledWith(filter);
      expect(toObject).toBeCalledTimes(1);
      expect(result).toEqual(out);
    });

    it('should return default config when not found', async () => {
      jest.spyOn(alertConfigModel, 'findOne').mockResolvedValueOnce(undefined);
      const result = await service.getAlertConfig();

      expect(result).toBeDefined();
      // The mock returns {"test": "value"} for plainToClass calls
      expect(result).toEqual({ test: 'value' });
    });
  });

  describe('updateAlertConfig', () => {
    it('should convert uploaded file to base64 and update the alert config', async () => {
      jest.spyOn(alertConfigModel, 'updateOne').mockResolvedValue(undefined);

      const alertConfig = {
        message: 'Test alert message',
        isVisible: true,
      };

      const mockFile = {
        originalname: 'test.jpg',
        buffer: Buffer.from('test-image-data'),
        mimetype: 'image/jpeg',
        size: 1000,
      } as Express.Multer.File;

      await service.updateAlertConfig(alertConfig, mockFile);

      const expectedBase64 = `data:image/jpeg;base64,${Buffer.from('test-image-data').toString('base64')}`;

      expect(alertConfigModel.updateOne).toBeCalledWith(
        { type: ConfigType.Alert },
        {
          $set: {
            ...alertConfig,
            logoBase64: expectedBase64,
            updatedAt: expect.any(Date),
            type: ConfigType.Alert,
          },
        },
        { upsert: true },
      );
    });

    it('should update alert config without logo when no file provided', async () => {
      jest.spyOn(alertConfigModel, 'updateOne').mockResolvedValue(undefined);

      const alertConfig = {
        message: 'Test alert message',
        isVisible: false,
      };

      await service.updateAlertConfig(alertConfig, undefined);

      expect(alertConfigModel.updateOne).toBeCalledWith(
        { type: ConfigType.Alert },
        {
          $set: {
            ...alertConfig,
            updatedAt: expect.any(Date),
            type: ConfigType.Alert,
          },
        },
        { upsert: true },
      );
    });

    it('should clear logoBase64 when no file and logoBase64 is undefined', async () => {
      jest.spyOn(alertConfigModel, 'updateOne').mockResolvedValue(undefined);

      const alertConfig = {
        message: 'Test alert message',
        isVisible: false,
        logoBase64: undefined,
      };

      await service.updateAlertConfig(alertConfig, undefined);

      expect(alertConfigModel.updateOne).toBeCalledWith(
        { type: ConfigType.Alert },
        {
          $set: {
            ...alertConfig,
            logoBase64: undefined,
            updatedAt: expect.any(Date),
            type: ConfigType.Alert,
          },
        },
        { upsert: true },
      );
    });
  });
});
