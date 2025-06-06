import { Body, Get, HttpCode, Param, Put } from '@nestjs/common';
import { ApiNoContentResponse, ApiOperation } from '@nestjs/swagger';
import { ApiController } from 'src/shared/decorators/api-controller.decorator';
import { Auth } from 'src/shared/decorators/auth.decorator';
import { Role } from 'src/shared/enums/role.enum';
import { AdminConfigService } from './admin-config.service';
import { AdminValidation } from './decorators/validation.decorator';
import { PlatformParamDto } from './dto/platform-param.dto';
import { TermsConfigCreateDto, TermsConfigGetDto } from './dto/terms/terms-config.dto';
import { DataPrivacyConfigCreateDto, DataPrivacyConfigGetDto } from './dto/data-privacy/data-privacy-config.dto';
import { DataSourceDto } from './dto/data-source.dto';

@ApiController('config')
export class AdminConfigController {
  constructor(private adminConfigService: AdminConfigService) {}

  @Auth(Role.Admin, Role.Researcher)
  @Get(':platform/terms')
  @AdminValidation()
  @ApiOperation({ summary: 'Returns the configuration for the terms and condition dialog' })
  findTermsConfig(@Param() { platform }: PlatformParamDto): Promise<TermsConfigGetDto> {
    return this.adminConfigService.findTermsConfig(platform);
  }

  @Auth(Role.Admin)
  @Put(':platform/terms')
  @AdminValidation()
  @ApiNoContentResponse({ description: 'Item successfully updated or created. No content returns.' })
  @HttpCode(204)
  @ApiOperation({ summary: 'Updates or creates the config for terms and conditions' })
  async updateTermsConfig(
    @Param() { platform }: PlatformParamDto,
    @Body() termsConfig: TermsConfigCreateDto,
  ): Promise<void> {
    return this.adminConfigService.updateTermsConfig(platform, termsConfig);
  }

  @Auth(Role.Admin, Role.Researcher)
  @Get(':platform/type-of-use-data-privacy')
  @AdminValidation()
  @ApiOperation({ summary: 'Returns the configuration for the Data Privacy of usage types and condition dialog' })
  getDataPrivacyConfig(@Param() { platform }: PlatformParamDto): Promise<DataPrivacyConfigGetDto> {
    return this.adminConfigService.getDataPrivacyConfig(platform);
  }

  @Auth(Role.Admin)
  @Put(':platform/type-of-use-data-privacy')
  @AdminValidation()
  @ApiNoContentResponse({ description: 'Item successfully updated or created. No content returns.' })
  @HttpCode(204)
  @ApiOperation({ summary: 'Updates or creates the config for the Data Privacy of usage types' })
  async updateDataPrivacyConfig(
    @Param() { platform }: PlatformParamDto,
    @Body() dataPrivacyConfig: DataPrivacyConfigCreateDto,
  ): Promise<void> {
    return this.adminConfigService.updateDataPrivacyConfig(platform, dataPrivacyConfig);
  }

  @Auth(Role.Admin, Role.Researcher)
  @Get('data-sources')
  @ApiOperation({ summary: 'Gets available data sources for proposals' })
  async getDataSources(): Promise<DataSourceDto> {
    return this.adminConfigService.getDataSources();
  }
}
