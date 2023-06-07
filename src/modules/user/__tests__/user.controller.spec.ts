import { Test } from '@nestjs/testing';
import { MockFunctionMetadata, ModuleMocker } from 'jest-mock';
import { UuidParamDto } from 'src/shared/dto/uuid-id-param.dto';
import { FdpgRequest } from 'src/shared/types/request-user.interface';
import { CreateUserDto } from '../dto/create-user.dto';
import { PasswordResetDto } from '../dto/password-reset.dto';
import { ResendInvitationDto } from '../dto/resend-invitation.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { KeycloakService } from '../keycloak.service';
import { UserController } from '../user.controller';

const moduleMocker = new ModuleMocker(global);

describe('UserController', () => {
  let userController: UserController;
  let keycloakService: KeycloakService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [UserController],
    })
      .useMocker((token) => {
        if (typeof token === 'function') {
          const mockMetadata = moduleMocker.getMetadata(token) as MockFunctionMetadata<any, any>;
          const Mock = moduleMocker.generateFromMetadata(mockMetadata);
          return new Mock();
        }
      })
      .compile();

    keycloakService = moduleRef.get<KeycloakService>(KeycloakService);
    userController = moduleRef.get<UserController>(UserController);
  });

  describe('create', () => {
    it('should create the user', async () => {
      const input = new CreateUserDto();
      const result = 'userId';
      jest.spyOn(keycloakService, 'createUser').mockResolvedValue(result);

      const call = userController.create(input);
      expect(await call).toBe(result);
      expect(keycloakService.createUser).toHaveBeenCalledWith(input);
    });
  });

  describe('updateProfile', () => {
    it('should trigger the actions email to reset the password', async () => {
      const input = new UpdateUserDto();
      const param = new UuidParamDto();
      const userId = 'userId';
      param.id = userId;
      const user = {};
      const request = { user } as FdpgRequest;
      const result = undefined;

      const call = userController.updateProfile(param, input, request);
      expect(await call).toBe(result);
      expect(keycloakService.updateProfile).toHaveBeenCalledWith(userId, input, user);
    });
  });

  describe('resendInvitation', () => {
    it('should resend the invitation to the user', async () => {
      const input = new ResendInvitationDto();
      const result = undefined;
      jest.spyOn(keycloakService, 'resendInvitation').mockResolvedValue(result);

      const call = userController.resendInvitation(input);
      expect(await call).toBe(result);
      expect(keycloakService.resendInvitation).toHaveBeenCalledWith(input);
    });
  });

  describe('passwordChange', () => {
    it('should trigger the actions email to reset the password', async () => {
      const input = new PasswordResetDto();
      const param = new UuidParamDto();
      const userId = 'userId';
      param.id = userId;
      const user = {};
      const request = { user } as FdpgRequest;
      const result = undefined;

      const call = userController.passwordChange(param, input, request);
      expect(await call).toBe(result);
      expect(keycloakService.executeActionsEmailForPassword).toHaveBeenCalledWith(userId, input, user);
    });
  });
});
