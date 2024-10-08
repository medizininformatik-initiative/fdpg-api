import { Test } from '@nestjs/testing';
import { MockFunctionMetadata, ModuleMocker } from 'jest-mock';
import { Role } from 'src/shared/enums/role.enum';
import { FdpgRequest } from 'src/shared/types/request-user.interface';
import { FeasibilityUserQueryDetailDto } from '../dto/feasibility-user-query-detail.dto';
import { FeasibilityController } from '../feasibility.controller';
import { FeasibilityService } from '../feasibility.service';

const moduleMocker = new ModuleMocker(global);

describe('FeasibilityController', () => {
  let feasibilityController: FeasibilityController;
  let feasibilityService: FeasibilityService;

  const request = {
    user: {
      userId: 'string',
      firstName: 'string',
      lastName: 'string',
      fullName: 'string',
      email: 'string',
      username: 'string',
      email_verified: true,
      roles: [Role.Researcher],
      singleKnownRole: Role.Researcher,
      isFromLocation: false,
      isKnownLocation: false,
    },
  } as FdpgRequest;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [FeasibilityController],
    })
      .useMocker((token) => {
        if (typeof token === 'function') {
          const mockMetadata = moduleMocker.getMetadata(token) as MockFunctionMetadata<any, any>;
          const Mock = moduleMocker.generateFromMetadata(mockMetadata);
          return new Mock();
        }
      })
      .compile();

    feasibilityService = moduleRef.get<FeasibilityService>(FeasibilityService);
    feasibilityController = moduleRef.get<FeasibilityController>(FeasibilityController);
  });

  describe('getQueriesByUser', () => {
    it('should all saved feasibility queries for the user', async () => {
      const result = [new FeasibilityUserQueryDetailDto()];
      jest.spyOn(feasibilityService, 'getQueriesByUser').mockResolvedValue(result);

      const call = feasibilityController.getQueriesByUser(request);
      expect(await call).toBe(result);
      expect(feasibilityService.getQueriesByUser).toHaveBeenCalledWith(request.user.userId);
    });
  });
});
