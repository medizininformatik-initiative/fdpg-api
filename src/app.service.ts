import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthDto } from './health.dto';

@Injectable()
export class AppService {
  health = new HealthDto();

  constructor(private readonly configService: ConfigService) {
    this.health.softwareVersion = this.configService.get('SOFTWARE_VERSION');
    this.health.buildDate = this.configService.get('BUILD_DATE');
    this.health.buildTime = this.configService.get('BUILD_TIME');
    this.health.buildNoOfDate = this.configService.get('BUILD_NO_OF_DATE');
    this.health.env = this.configService.get('ENV');
    this.health.sourceBranch = this.configService.get('SOURCE_BRANCH');
  }

  getHealth(): HealthDto {
    return this.health;
  }
}
