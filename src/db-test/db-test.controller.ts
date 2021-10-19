import { Get } from '@nestjs/common';

import { ApiController } from 'src/shared/decorators/api-controller.decorator';
import { DbTestService } from './db-test.service';
import { DbTestDto } from './dto/db-test.dto';

@ApiController('db-test', '1')
export class DbTestController {
  constructor(private readonly dbTestService: DbTestService) {}

  @Get()
  findAll(): Promise<DbTestDto[]> {
    return this.dbTestService.findAll();
  }
}
