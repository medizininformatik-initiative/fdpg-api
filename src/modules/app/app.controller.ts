import { Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiController } from '../../shared/decorators/api-controller.decorator';
import { AppService } from './app.service';
import { HealthDto } from './health.dto';

@ApiController('', VERSION_NEUTRAL)
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  getHealth(): HealthDto {
    return this.appService.getHealth();
  }
}
