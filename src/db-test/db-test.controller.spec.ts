import { Test, TestingModule } from '@nestjs/testing';
import { DbTestController } from './db-test.controller';
import { DbTestService } from './db-test.service';

describe('DbTestController', () => {
  let controller: DbTestController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DbTestController],
      providers: [DbTestService],
    }).compile();

    controller = module.get<DbTestController>(DbTestController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
