import { Test, TestingModule } from '@nestjs/testing';
import { MockFunctionMetadata, ModuleMocker } from 'jest-mock';
import { KeycloakClient } from '../keycloak.client';
import { KeycloakService } from '../keycloak.service';
import { Cache } from 'cache-manager';
import { ForbiddenException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { PasswordResetDto } from '../dto/password-reset.dto';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import { Role } from 'src/shared/enums/role.enum';
import { KeycloakRequiredAction } from '../enums/keycloak-required-action.enum';
import * as userInviteErrors from '../error-handling/user-invite.errors';
import * as createUserErrors from '../error-handling/create-user.errors';
import { getError, NoErrorThrownError } from 'test/get-error';
import { AxiosError, AxiosInstance } from 'axios';
import { UpdateUserDto } from '../dto/update-user.dto';
import { ICreateKeycloakUser, IGetKeycloakUser, IUpdateKeycloakProfile } from '../types/keycloak-user.interface';
import { IKeycloakActionsEmail } from '../types/keycloak-actions-email.interface';
import { ResendInvitationDto } from '../dto/resend-invitation.dto';
import { CreateUserDto } from '../dto/create-user.dto';
import { KeycloakLocale } from '../enums/keycloak-locale.enum';
import { ValidationException } from 'src/exceptions/validation/validation.exception';
import { MiiLocation } from 'src/shared/constants/mii-locations';
import * as uuid from 'uuid';
import { CacheKey } from 'src/shared/enums/cache-key.enum';
import { IKeycloakRole } from '../types/keycloak-role-assignment.interface';

jest.mock('uuid', () => {
  const originial = jest.requireActual('uuid');
  return {
    ...originial,
    validate: jest.fn(),
  };
});
const moduleMocker = new ModuleMocker(global);
describe('KeycloakService', () => {
  let service: KeycloakService;
  let keycloakClient: KeycloakClient;
  let apiClient: AxiosInstance;
  let cache: Cache;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KeycloakService,
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
          },
        },
        {
          provide: KeycloakClient,
          useValue: {
            client: {
              get: jest.fn(),
              post: jest.fn(),
              put: jest.fn(),
              deleteOne: jest.fn(),
            },
          },
        },
      ],
      imports: [],
    })
      .useMocker((token) => {
        if (typeof token === 'function') {
          const mockMetadata = moduleMocker.getMetadata(token) as MockFunctionMetadata<any, any>;
          const Mock = moduleMocker.generateFromMetadata(mockMetadata);
          return new Mock();
        }
      })
      .compile();

    service = module.get<KeycloakService>(KeycloakService);
    keycloakClient = module.get<KeycloakClient>(KeycloakClient);
    apiClient = keycloakClient.client;
    cache = module.get<Cache>(CACHE_MANAGER);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUserById', () => {
    it('should return a user', async () => {
      const userId = '12345';
      const expectedResult = { id: '12345', name: 'max' };
      const getResponse = {
        data: expectedResult,
      };
      const getSpy = jest.spyOn(apiClient, 'get').mockResolvedValueOnce(getResponse);

      const result = await service.getUserById(userId);

      expect(getSpy).toHaveBeenCalledWith(`/users/${userId}`);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getUsers', () => {
    it('should return an array of users', async () => {
      const user1 = { id: '123', firstName: 'max' };

      const expectedResult = [user1];
      const getResponse = {
        data: expectedResult,
      };
      const getSpy = jest.spyOn(apiClient, 'get').mockResolvedValueOnce(getResponse);

      const query = { firstName: 'max' };
      const result = await service.getUsers(query);

      expect(getSpy).toHaveBeenCalledWith('/users', { params: { max: -1, ...query } });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getUsersByRole', () => {
    it('should return an array of users', async () => {
      const user1 = { id: '123', firstName: 'max' };

      const expectedResult = [user1];
      const getResponse = {
        data: expectedResult,
      };
      const getSpy = jest.spyOn(apiClient, 'get').mockResolvedValueOnce(getResponse);
      const role = Role.DizMember;
      const result = await service.getUsersByRole(role);

      expect(getSpy).toHaveBeenCalledWith(`/roles/${role}/users`, { params: { max: -1 } });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getValidUsersByEmailSettled', () => {
    const setup = [
      {
        emailVerified: true,
        requiredActions: [],
        expectingUser: true,
      },
      {
        emailVerified: false,
        requiredActions: [],
        expectingUser: false,
      },
      {
        emailVerified: true,
        requiredActions: ['some Action'],
        expectingUser: false,
      },
    ];
    test.each(setup)('should return an array of users', async ({ emailVerified, requiredActions, expectingUser }) => {
      const user1 = { id: '1', email: '1@test.com', emailVerified, requiredActions };

      const expectedResult = expectingUser ? [user1] : [];
      const getResponse1 = {
        data: expectedResult,
      };
      const getResponse2 = {
        data: [],
      };

      const getSpy = jest.spyOn(apiClient, 'get');
      getSpy
        .mockResolvedValueOnce(getResponse1)
        .mockResolvedValueOnce(getResponse2)
        .mockRejectedValueOnce(new Error('something went wrong'));

      const emails = ['1@test.com', '2@test.com', '3@test.com'];
      const result = await service.getValidUsersByEmailSettled(emails);

      expect(getSpy).toHaveBeenCalledWith('/users', { params: { max: -1, email: emails[0], exact: true } });
      expect(getSpy).toHaveBeenCalledWith('/users', { params: { max: -1, email: emails[1], exact: true } });
      expect(getSpy).toHaveBeenCalledWith('/users', { params: { max: -1, email: emails[2], exact: true } });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getValidUsersByIdSettled', () => {
    const setup = [
      {
        emailVerified: true,
        requiredActions: [],
        expectingUser: true,
      },
      {
        emailVerified: false,
        requiredActions: [],
        expectingUser: false,
      },
      {
        emailVerified: true,
        requiredActions: ['some Action'],
        expectingUser: false,
      },
    ];
    test.each(setup)('should return the user', async ({ emailVerified, requiredActions, expectingUser }) => {
      const user1 = { id: '1', email: '1@test.com', emailVerified, requiredActions };

      const expectedResult = expectingUser ? [user1] : [];
      const getResponse1 = {
        data: expectingUser ? user1 : undefined,
      };
      const getResponse2 = {
        data: undefined,
      };

      const getSpy = jest.spyOn(apiClient, 'get');
      getSpy
        .mockResolvedValueOnce(getResponse1)
        .mockResolvedValueOnce(getResponse2)
        .mockRejectedValueOnce(new Error('something went wrong'));

      const userIds = ['1', '2', '3'];
      const result = await service.getValidUsersByIdSettled(userIds);

      expect(getSpy).toHaveBeenCalledWith(`/users/${userIds[0]}`);
      expect(getSpy).toHaveBeenCalledWith(`/users/${userIds[1]}`);
      expect(getSpy).toHaveBeenCalledWith(`/users/${userIds[2]}`);

      expect(result).toEqual(expectedResult);
    });
  });

  describe('createUser', () => {
    let user: Partial<CreateUserDto>;
    let keycloakUser: Partial<ICreateKeycloakUser>;

    beforeEach(() => {
      user = {
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        clientId: 'testclient',
        redirectUri: 'http://localhost',
      };

      keycloakUser = {
        ...user,
        enabled: true,
        requiredActions: [KeycloakRequiredAction.UpdateProfile, KeycloakRequiredAction.UpdatePassword],
        attributes: { locale: [KeycloakLocale.De] },
      };
    });

    test.each([Role.DizMember, Role.UacMember])(
      'should throw an error if role is DizMember or UacMember and location is not provided',
      async (role) => {
        user.role = role;

        const call = service.createUser(user as CreateUserDto);
        const error = await getError(async () => await call);

        expect(error).toBeDefined();
        expect(error).toBeInstanceOf(ValidationException);
      },
    );

    test.each([Role.DizMember, Role.UacMember])(
      'should add MII_LOCATION attribute to keycloak user if role is DizMember or UacMember and location is provided',
      async (role) => {
        user.role = role;
        user.location = MiiLocation.Charité;

        const expectedUser = {
          attributes: {
            ['MII_LOCATION']: [MiiLocation.Charité],
            locale: [KeycloakLocale.De],
          },
        };

        const registerSpy = jest.spyOn(service, 'registerUser').mockResolvedValueOnce('1');
        const roleSpy = jest.spyOn(service, 'addRoleToUser').mockResolvedValueOnce();
        const emailSpy = jest.spyOn(service, 'executeActionsEmailForInvitation').mockResolvedValueOnce();

        await service.createUser(user as CreateUserDto);

        expect(registerSpy).toHaveBeenCalledWith(expect.objectContaining(expectedUser));
      },
    );

    it('should add a role to the created user if a valid role is provided', async () => {
      const userId = '1';
      const registerSpy = jest.spyOn(service, 'registerUser').mockResolvedValueOnce(userId);
      const roleSpy = jest.spyOn(service, 'addRoleToUser').mockResolvedValueOnce();
      const emailSpy = jest.spyOn(service, 'executeActionsEmailForInvitation').mockResolvedValueOnce();

      user.role = Role.UacMember;
      user.location = MiiLocation.Charité;

      const result = await service.createUser(user as CreateUserDto);

      expect(roleSpy).toHaveBeenCalledWith(userId, Role.UacMember);
      expect(emailSpy).toHaveBeenCalledWith(userId, user.clientId, user.redirectUri);
      expect(result).toEqual(userId);
    });
  });

  describe('updateProfile', () => {
    it('should throw ForbiddenException if userId does not match the userId of the user requesting the action', async () => {
      const userId = '123';
      const updateUserDto = new UpdateUserDto();
      const user = { userId: '456', roles: [Role.Researcher] } as IRequestUser;

      const call = service.updateProfile(userId, updateUserDto, user);
      const error = await getError(async () => await call);

      expect(error).toBeDefined();
      expect(error).not.toBeInstanceOf(NoErrorThrownError);
      expect(error).toBeInstanceOf(ForbiddenException);
    });

    it('should throw NotFoundException if the user is not found', async () => {
      const userId = '123';
      const updateUserDto = new UpdateUserDto();
      const user = { userId: '123', roles: [Role.FdpgMember] } as IRequestUser;

      const axiosError = new AxiosError();
      axiosError.response = {
        status: 404,
      } as any;
      jest.spyOn(service, 'getUserById').mockRejectedValueOnce(axiosError);
      const call = service.updateProfile(userId, updateUserDto, user);
      const error = await getError(async () => await call);

      expect(error).toBeDefined();
      expect(error).not.toBeInstanceOf(NoErrorThrownError);
      expect(error).toBeInstanceOf(NotFoundException);
    });

    it('should successfully update the profile if all conditions are met', async () => {
      const user = { userId: '123', roles: [Role.FdpgMember] } as IRequestUser;
      const userId = '123';
      const updateUserDto = { getMergedUser: jest.fn() } as unknown as UpdateUserDto;
      const keycloakUser = {
        id: 'keycloakUser',
      } as IGetKeycloakUser;
      const mergedUser = {} as IUpdateKeycloakProfile;

      jest.spyOn(updateUserDto, 'getMergedUser').mockReturnValueOnce(mergedUser);
      jest.spyOn(service, 'getUserById').mockResolvedValueOnce(keycloakUser);

      await service.updateProfile(userId, updateUserDto, user);

      expect(updateUserDto.getMergedUser).toBeCalledWith(keycloakUser);
      expect(apiClient.put).toBeCalledWith(`/users/${userId}`, mergedUser);
    });
  });

  describe('registerUser', () => {
    it('should register a user in Keycloak and return the userId', async () => {
      const user = { username: 'testuser', email: 'test@example.com' };
      const userId = '123';
      const postResponse = {
        headers: {
          location: `...auth/admin/realms/fdpg/users/${userId}`,
        },
      };
      const postSpy = jest.spyOn(apiClient, 'post').mockResolvedValueOnce(postResponse);
      const uuidSpy = jest.spyOn(uuid, 'validate').mockReturnValueOnce(true);

      const result = await service.registerUser(user as ICreateKeycloakUser);
      expect(result).toEqual(userId);
    });

    it('should try to get the userId via api if it is not in the header', async () => {
      const user = { username: 'testuser', email: 'test@example.com' };
      const userId = '123';
      const postResponse = {
        headers: {
          location: `...auth/admin/realms/fdpg/users/notHere`,
        },
      };
      const postSpy = jest.spyOn(apiClient, 'post').mockResolvedValueOnce(postResponse);
      const uuidSpy = jest.spyOn(uuid, 'validate').mockReturnValueOnce(false).mockReturnValueOnce(true);
      const getUsersSpy = jest.spyOn(service, 'getUsers').mockResolvedValueOnce([{ id: userId } as IGetKeycloakUser]);
      const result = await service.registerUser(user as ICreateKeycloakUser);
      expect(result).toEqual(userId);
    });

    it('should throw if the user could not be registered', async () => {
      const someError = new Error('some error');
      const postSpy = jest.spyOn(apiClient, 'post').mockRejectedValueOnce(someError);
      const errorSpy = jest.spyOn(createUserErrors, 'handleRegisterErrors').mockImplementationOnce(() => {
        throw someError;
      });

      const call = service.registerUser({} as ICreateKeycloakUser);
      await getError(async () => await call);
      expect(errorSpy).toBeCalledWith(someError);
    });
  });

  describe('getAvailableRoles', () => {
    it('should call the api if the cache is empty and return a map of roles', async () => {
      const mockRoles = [{ name: Role.Admin }];

      const apiGetSpy = jest.spyOn(apiClient, 'get').mockImplementation(() => Promise.resolve({ data: mockRoles }));
      const cacheGetSpy = jest.spyOn(cache, 'get').mockImplementation(() => Promise.resolve());
      const cacheSetSpy = jest.spyOn(cache, 'set').mockImplementation(() => Promise.resolve());

      const result = await service.getAvailableRoles();

      expect(result).toEqual(new Map([[Role.Admin, { name: Role.Admin }]]));
      expect(apiGetSpy).toHaveBeenCalledWith('/roles');
      expect(cacheGetSpy).toHaveBeenCalledWith(CacheKey.AllRoles);
      expect(cacheSetSpy).toHaveBeenCalledWith(
        CacheKey.AllRoles,
        new Map([[Role.Admin, { name: Role.Admin }]]),
        1800000,
      );
    });

    it('should return a map of roles from the cache', async () => {
      const mockMap = new Map([[Role.Admin, { name: Role.Admin }]]);

      const apiGetSpy = jest.spyOn(apiClient, 'get').mockImplementation(() => Promise.resolve());
      const cacheGetSpy = jest.spyOn(cache, 'get').mockImplementation(() => Promise.resolve(mockMap));
      const cacheSetSpy = jest.spyOn(cache, 'set').mockImplementation(() => Promise.resolve());

      const result = await service.getAvailableRoles();

      expect(result).toEqual(mockMap);
      expect(apiGetSpy).not.toHaveBeenCalledWith('/roles');
      expect(cacheGetSpy).toHaveBeenCalledWith(CacheKey.AllRoles);
      expect(cacheSetSpy).not.toHaveBeenCalledWith(
        CacheKey.AllRoles,
        new Map([[Role.Admin, { name: Role.Admin }]]),
        1800000,
      );
    });

    it('should throw an InternalServerErrorException if fetching roles fails', async () => {
      jest.spyOn(apiClient, 'get').mockRejectedValueOnce('new error');

      const call = service.getAvailableRoles();
      const error = await getError(async () => await call);

      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(InternalServerErrorException);
    });
  });

  describe('addRoleToUser', () => {
    it('should add role to user in keycloak', async () => {
      const userId = '12345';
      const role = Role.Admin;
      const mockMap = new Map([[Role.Admin, { name: Role.Admin }]]) as Map<Role, IKeycloakRole>;

      jest.spyOn(service, 'getAvailableRoles').mockResolvedValueOnce(mockMap);
      await service.addRoleToUser(userId, role);

      expect(apiClient.post).toHaveBeenCalledWith(`/users/${userId}/role-mappings/realm`, [{ name: Role.Admin }]);
    });

    it('should throw an InternalServerErrorException if fetching roles fails', async () => {
      const userId = '12345';
      const role = Role.Admin;
      const mockMap = new Map([[Role.Admin, { name: Role.Admin }]]) as Map<Role, IKeycloakRole>;

      jest.spyOn(service, 'getAvailableRoles').mockResolvedValueOnce(mockMap);
      jest.spyOn(apiClient, 'post').mockRejectedValueOnce('new error');

      const call = service.addRoleToUser(userId, role);
      const error = await getError(async () => await call);

      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(InternalServerErrorException);
    });
  });

  describe('resendInvitation', () => {
    let resendInvitationDto: ResendInvitationDto;

    beforeEach(() => {
      resendInvitationDto = {
        email: 'test@example.com',
        clientId: 'clientId',
        redirectUri: 'redirectUri',
      };
    });

    it('should throw NotFoundException if no users with given email are registered', async () => {
      jest.spyOn(service, 'getUsers').mockResolvedValueOnce([]);

      const call = service.resendInvitation(resendInvitationDto);
      const error = await getError(async () => await call);

      expect(error).toBeDefined();
      expect(error).not.toBeInstanceOf(NoErrorThrownError);
      expect(error).toBeInstanceOf(NotFoundException);

      expect(service.getUsers).toHaveBeenCalledWith({ email: resendInvitationDto.email });
    });

    it('should executeActionsEmailForInvitation for not fully registered users', async () => {
      const user1 = { id: 'user1', emailVerified: false, requiredActions: [{}] } as IGetKeycloakUser;
      const user2 = { id: 'user2', emailVerified: true, requiredActions: [] } as IGetKeycloakUser;

      jest.spyOn(service, 'getUsers').mockResolvedValueOnce([user1, user2]);
      const spyEmailHandler = jest.spyOn(service, 'executeActionsEmailForInvitation').mockImplementation();
      await service.resendInvitation(resendInvitationDto);

      expect(spyEmailHandler).toHaveBeenCalledWith(
        'user1',
        resendInvitationDto.clientId,
        resendInvitationDto.redirectUri,
      );
      expect(spyEmailHandler).not.toHaveBeenCalledWith('user2');
    });
  });

  describe('executeActionsEmailForInvitation', () => {
    it('should execute the required actions and send an email', async () => {
      const userId = '123';
      const clientId = '456';
      const redirectUri = 'http://example.com';

      const params: IKeycloakActionsEmail = {
        client_id: clientId,
        redirect_uri: redirectUri,
        // => 7 Days
        lifespan: 7 * 24 * 60 * 60,
      };

      const actions = [KeycloakRequiredAction.UpdateProfile, KeycloakRequiredAction.UpdatePassword];

      await service.executeActionsEmailForInvitation(userId, clientId, redirectUri);

      expect(apiClient.put).toHaveBeenCalledWith(`/users/${userId}/execute-actions-email`, actions, { params });
    });

    it('should handle errors correctly', async () => {
      const userId = '123';
      const clientId = '456';
      const redirectUri = 'http://example.com';

      const error = new ForbiddenException();
      const spyHandleError = jest.spyOn(userInviteErrors, 'handleActionsEmailError').mockImplementation();
      jest.spyOn(apiClient, 'put').mockRejectedValueOnce(error);

      await service.executeActionsEmailForInvitation(userId, clientId, redirectUri);
      expect(spyHandleError).toBeCalledWith(error);
    });
  });

  describe('executeActionsEmailForPassword', () => {
    let userId: string;
    let passwordResetDto: PasswordResetDto;
    let user: IRequestUser;

    beforeEach(() => {
      userId = 'userId';
      passwordResetDto = { clientId: 'clientId', redirectUri: 'redirectUri' };
      user = { userId, roles: [Role.FdpgMember] } as IRequestUser;
    });

    it('should throw ForbiddenException if userId does not match the userId of the user requesting the action', async () => {
      const wrongUser = { ...user, userId: 'wrongUser', roles: [Role.Researcher] };

      const call = service.executeActionsEmailForPassword(userId, passwordResetDto, wrongUser);
      const error = await getError(async () => await call);

      expect(error).toBeDefined();
      expect(error).not.toBeInstanceOf(NoErrorThrownError);
      expect(error).toBeInstanceOf(ForbiddenException);
    });

    it('should call put with correct params if all conditions are met', async () => {
      const spyPut = jest.spyOn(apiClient, 'put');

      await service.executeActionsEmailForPassword(userId, passwordResetDto, user);

      expect(spyPut).toHaveBeenCalledWith(
        `/users/${userId}/execute-actions-email`,
        [KeycloakRequiredAction.UpdatePassword],
        {
          params: {
            client_id: passwordResetDto.clientId,
            redirect_uri: passwordResetDto.redirectUri,
            lifespan: 5 * 60,
          },
        },
      );
    });

    it('should call handleActionsEmailError if apiClient throws error', async () => {
      const spyHandleError = jest.spyOn(userInviteErrors, 'handleActionsEmailError').mockImplementation();

      jest.spyOn(keycloakClient.client, 'put').mockRejectedValueOnce({});

      await service.executeActionsEmailForPassword(userId, passwordResetDto, user);

      expect(spyHandleError).toHaveBeenCalled();
    });
  });
});
