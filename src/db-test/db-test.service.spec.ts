import { Test, TestingModule } from '@nestjs/testing';
import { DbTestService } from './db-test.service';

describe('DbTestService', () => {
  let service: DbTestService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DbTestService],
    }).compile();

    service = module.get<DbTestService>(DbTestService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
