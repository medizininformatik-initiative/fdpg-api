import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { AppController } from '../app.controller';
import { AppService } from '../app.service';
import { HealthDto } from '../health.dto';

describe('AppController', () => {
  let appController: AppController;
  let appService: AppService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
      imports: [ConfigModule],
    }).compile();

    appService = moduleRef.get<AppService>(AppService);
    appController = moduleRef.get<AppController>(AppController);
  });

  describe('getHealth', () => {
    it('should return health', () => {
      const result = new HealthDto();
      jest.spyOn(appController, 'getHealth').mockReturnValue(result);
      expect(appController.getHealth()).toBe(result);
    });
  });
});
