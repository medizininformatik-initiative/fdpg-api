import { Test, TestingModule } from '@nestjs/testing';
import { AuthTestController } from './auth-test.controller';
import { AuthTestService } from './auth-test.service';

describe('AuthTestController', () => {
  let controller: AuthTestController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthTestController],
      providers: [AuthTestService],
    }).compile();

    controller = module.get<AuthTestController>(AuthTestController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
