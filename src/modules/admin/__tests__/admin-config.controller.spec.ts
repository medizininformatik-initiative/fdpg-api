import { Test } from '@nestjs/testing';
import { MockFunctionMetadata, ModuleMocker } from 'jest-mock';
import { AdminConfigController } from '../admin-config.controller';
import { AdminConfigService } from '../admin-config.service';
import { TermsConfigCreateDto, TermsConfigGetDto } from '../dto/terms/terms-config.dto';
import { PlatformIdentifier } from '../enums/platform-identifier.enum';
import { DataPrivacyConfigCreateDto, DataPrivacyConfigGetDto } from '../dto/data-privacy/data-privacy-config.dto';
import { DataSourceDto } from '../dto/data-source.dto';

const moduleMocker = new ModuleMocker(global);

describe('AdminConfigController', () => {
  let adminConfigController: AdminConfigController;
  let adminConfigService: AdminConfigService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AdminConfigController],
    })
      .useMocker((token) => {
        if (typeof token === 'function') {
          const mockMetadata = moduleMocker.getMetadata(token) as MockFunctionMetadata<any, any>;
          const Mock = moduleMocker.generateFromMetadata(mockMetadata);
          return new Mock();
        }
      })
      .compile();

    adminConfigService = moduleRef.get<AdminConfigService>(AdminConfigService);
    adminConfigController = moduleRef.get<AdminConfigController>(AdminConfigController);
  });

  describe('findTermsConfig', () => {
    it('should return the terms and conditions config for the desired platform', async () => {
      const platform = PlatformIdentifier.Mii;
      const params = {
        platform,
      };
      const result = new TermsConfigGetDto();
      jest.spyOn(adminConfigService, 'findTermsConfig').mockResolvedValue(result);

      const call = adminConfigController.findTermsConfig(params);
      expect(await call).toBe(result);
      expect(adminConfigService.findTermsConfig).toHaveBeenCalledWith(platform);
    });
  });

  describe('updateTermsConfig', () => {
    it('should update the terms and conditions for the desired platform', async () => {
      const platform = PlatformIdentifier.Mii;
      const params = {
        platform,
      };

      const input = new TermsConfigCreateDto();

      jest.spyOn(adminConfigService, 'updateTermsConfig').mockResolvedValue();

      const call = adminConfigController.updateTermsConfig(params, input);
      await call;
      expect(adminConfigService.updateTermsConfig).toHaveBeenCalledWith(platform, input);
    });
  });

  describe('getDataPrivacyConfig', () => {
    it('should return the data privacy config for the desired platform', async () => {
      const platform = PlatformIdentifier.Mii;
      const params = {
        platform,
      };
      const result = new DataPrivacyConfigGetDto();
      jest.spyOn(adminConfigService, 'getDataPrivacyConfig').mockResolvedValue(result);

      const call = adminConfigController.getDataPrivacyConfig(params);
      expect(await call).toBe(result);
      expect(adminConfigService.getDataPrivacyConfig).toHaveBeenCalledWith(platform);
    });
  });

  describe('updateDataPrivacyConfig', () => {
    it('should update the data privacy config for the desired platform', async () => {
      const platform = PlatformIdentifier.Mii;
      const params = {
        platform,
      };

      const input = new DataPrivacyConfigCreateDto();

      jest.spyOn(adminConfigService, 'updateDataPrivacyConfig').mockResolvedValue();

      const call = adminConfigController.updateDataPrivacyConfig(params, input);
      await call;
      expect(adminConfigService.updateDataPrivacyConfig).toHaveBeenCalledWith(platform, input);
    });
  });

  describe('getDataSources', () => {
    it('should return available data sources', async () => {
      const dataSources: DataSourceDto[] = [
        {
          _id: 'id1' as any,
          tag: PlatformIdentifier.DIFE,
          title: 'proposal.dife_title',
          description: 'proposal.dife_description',
          externalLink: 'proposal.dife_link',
        },
        {
          _id: 'id2' as any,
          tag: PlatformIdentifier.Mii,
          title: 'proposal.mii_title',
          description: 'proposal.mii_description',
          externalLink: 'proposal.mii_link',
        },
      ];

      jest.spyOn(adminConfigService, 'getDataSources').mockResolvedValue(dataSources);

      const result = await adminConfigController.getDataSources();
      expect(result).toBe(dataSources);
      expect(adminConfigService.getDataSources).toHaveBeenCalled();
    });
  });
});
