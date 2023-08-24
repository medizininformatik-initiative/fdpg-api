import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthDto } from './health.dto';

@Injectable()
export class AppService {
  health = new HealthDto();

  constructor(private readonly configService: ConfigService) {
    this.health.softwareVersion = this.configService.get('SOFTWARE_VERSION');
    this.health.releaseDate = this.configService.get('BUILD_DATE');
    this.health.releaseTime = this.configService.get('BUILD_TIME');
    this.health.releaseNoOfDate = this.configService.get('BUILD_NO_OF_DATE');
    this.health.env = this.configService.get('ENV');
    this.health.env = this.configService.get('ENV');
  }

  getHealth(): HealthDto {
    return this.health;
  }

  getHello(): string {
    return 'Hello World!';
  }
}
