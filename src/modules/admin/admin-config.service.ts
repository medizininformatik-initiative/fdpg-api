import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { plainToClass } from 'class-transformer';
import { Model } from 'mongoose';
import { DataPrivacyConfigCreateDto, DataPrivacyConfigGetDto } from './dto/data-privacy/data-privacy-config.dto';
import { TermsConfigGetDto } from './dto/terms/terms-config.dto';
import { ConfigType } from './enums/config-type.enum';
import { PlatformIdentifier } from './enums/platform-identifier.enum';
import { DataPrivacyConfig, DataPrivacyConfigDocument } from './schema/data-privacy/data-privacy-config.schema';
import { TermsConfig, TermsConfigDocument } from './schema/terms/terms-config.schema';
import { DataSourceDto } from './dto/data-source.dto';

@Injectable()
export class AdminConfigService {
  constructor(
    @InjectModel(TermsConfig.name)
    private termsConfigModel: Model<TermsConfigDocument>,

    @InjectModel(DataPrivacyConfig.name)
    private dataPrivacyConfigModel: Model<DataPrivacyConfigDocument>,
  ) {}

  async findTermsConfig(platform: PlatformIdentifier): Promise<TermsConfigGetDto> {
    const document = await this.termsConfigModel.findOne({ type: ConfigType.TermsDialog, platform });
    if (document) {
      const plain = document.toObject();
      return plainToClass(TermsConfigGetDto, plain);
    } else {
      throw new NotFoundException();
    }
  }

  async updateTermsConfig(platform: PlatformIdentifier, termsConfig: Partial<TermsConfig>): Promise<void> {
    termsConfig.updatedAt = new Date();
    termsConfig.platform = platform;
    termsConfig.type = ConfigType.TermsDialog;

    await this.termsConfigModel.updateOne(
      { type: ConfigType.TermsDialog, platform },
      { $set: termsConfig },
      { upsert: true },
    );
  }

  async getDataPrivacyConfig(platform: PlatformIdentifier): Promise<DataPrivacyConfigGetDto> {
    const document = await this.dataPrivacyConfigModel.findOne({ type: ConfigType.DataPrivacy, platform });
    if (document) {
      const plain = document.toObject();
      return plainToClass(DataPrivacyConfigGetDto, plain);
    } else {
      throw new NotFoundException();
    }
  }

  async updateDataPrivacyConfig(
    platform: PlatformIdentifier,
    dataPrivacyConfig: DataPrivacyConfigCreateDto,
  ): Promise<void> {
    await this.dataPrivacyConfigModel.updateOne(
      { type: ConfigType.DataPrivacy, platform },
      {
        $set: {
          ...dataPrivacyConfig,
          updatedAt: new Date(),
          platform: platform,
          type: ConfigType.DataPrivacy,
        },
      },
      { upsert: true },
    );
  }

  async getDataSources(): Promise<DataSourceDto> {
    const dataSources = {
      [PlatformIdentifier.DIFE]: {
        title: 'proposal.dife_title',
        description: 'proposal.dife_description',
        externalLink: 'proposal.dife_link',
      },
      [PlatformIdentifier.Mii]: {
        title: 'proposal.mii_title',
        description: 'proposal.mii_description',
        externalLink: 'proposal.mii_link',
      },
    };

    return dataSources;
  }
}
