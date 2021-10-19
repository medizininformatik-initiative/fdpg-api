import { Test, TestingModule } from '@nestjs/testing';
import { AuthTestService } from './auth-test.service';

describe('AuthTestService', () => {
  let service: AuthTestService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthTestService],
    }).compile();

    service = module.get<AuthTestService>(AuthTestService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
