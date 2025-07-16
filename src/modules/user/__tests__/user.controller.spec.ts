import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { UserController } from '../user.controller';
import { KeycloakService } from '../keycloak.service';
import { KeycloakUtilService } from '../keycloak-util.service';
import { IGetKeycloakUser } from '../types/keycloak-user.interface';
import { UserQueryDto } from '../dto/user-query.dto';
import { MiiLocation } from 'src/shared/constants/mii-locations';

describe('UserController', () => {
  let controller: UserController;
  let keycloakService: jest.Mocked<KeycloakService>;
  let keycloakUtilService: jest.Mocked<KeycloakUtilService>;
  let cacheManager: jest.Mocked<any>;

  const mockUser: IGetKeycloakUser = {
    id: '1',
    username: 'testuser',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    enabled: true,
    emailVerified: true,
    requiredActions: [],
    attributes: {
      MII_LOCATION: [MiiLocation.UKT],
    },
    createdTimestamp: Date.now(),
    totp: false,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: KeycloakService,
          useValue: {
            createUser: jest.fn(),
            getUsers: jest.fn(),
            getUserEmails: jest.fn(),
            updateProfile: jest.fn(),
            resendInvitation: jest.fn(),
            executeActionsEmailForPassword: jest.fn(),
          },
        },
        {
          provide: KeycloakUtilService,
          useValue: {
            filterForReceivingEmail: jest.fn(),
          },
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    keycloakService = module.get(KeycloakService);
    keycloakUtilService = module.get(KeycloakUtilService);
    cacheManager = module.get(CACHE_MANAGER);
  });

  describe('getUserEmails', () => {
    beforeEach(() => {
      // Reset cache to return null (cache miss) by default
      cacheManager.get.mockResolvedValue(null);
      cacheManager.set.mockResolvedValue(undefined);
      keycloakService.getUserEmails.mockReset();
    });

    it('should get all user emails with default settings', async () => {
      const query: UserQueryDto = {};
      const resultData = { emails: ['test@example.com'], total: 1 };
      keycloakService.getUserEmails.mockResolvedValue(resultData);
      keycloakUtilService.filterForReceivingEmail.mockReturnValue(true);

      const result = await controller.getUserEmails(query);

      expect(keycloakService.getUserEmails).toHaveBeenCalledWith(query);
      expect(result).toEqual(resultData);
    });

    it('should exclude users with unverified emails', async () => {
      const query: UserQueryDto = {};
      const resultData = { emails: ['test@example.com'], total: 1 };
      keycloakService.getUserEmails.mockResolvedValue(resultData);

      const result = await controller.getUserEmails(query);

      expect(result).toEqual(resultData);
    });

    it('should exclude users with required actions', async () => {
      const query: UserQueryDto = {};
      const resultData = { emails: ['test@example.com'], total: 1 };
      keycloakService.getUserEmails.mockResolvedValue(resultData);

      const result = await controller.getUserEmails(query);

      expect(result).toEqual(resultData);
    });

    it('should exclude users who disabled email notifications by default', async () => {
      const query: UserQueryDto = {};
      const resultData = { emails: [], total: 0 };
      keycloakService.getUserEmails.mockResolvedValue(resultData);

      const result = await controller.getUserEmails(query);

      expect(result).toEqual(resultData);
    });

    it('should handle empty user list', async () => {
      const query: UserQueryDto = {};
      const resultData = { emails: [], total: 0 };
      keycloakService.getUserEmails.mockResolvedValue(resultData);

      const result = await controller.getUserEmails(query);

      expect(result).toEqual(resultData);
    });

    it('should handle multiple valid users', async () => {
      const query: UserQueryDto = {};
      const resultData = { emails: ['test@example.com', 'test2@example.com'], total: 2 };
      keycloakService.getUserEmails.mockResolvedValue(resultData);

      const result = await controller.getUserEmails(query);

      expect(result).toEqual(resultData);
    });

    it('should filter emails by startsWith parameter', async () => {
      const query: UserQueryDto = { startsWith: 'tes' };
      const resultData = { emails: ['test@example.com', 'test2@example.com'], total: 2 };
      keycloakService.getUserEmails.mockResolvedValue(resultData);

      const result = await controller.getUserEmails(query);

      expect(result).toEqual(resultData);
    });

    it('should filter emails by startsWith parameter case insensitive', async () => {
      const query: UserQueryDto = { startsWith: 'TES' };
      const resultData = { emails: ['test@example.com', 'test2@example.com'], total: 2 };
      keycloakService.getUserEmails.mockResolvedValue(resultData);

      const result = await controller.getUserEmails(query);

      expect(result).toEqual(resultData);
    });

    it('should return empty array when no emails match startsWith parameter', async () => {
      const query: UserQueryDto = { startsWith: 'xyz' };
      const resultData = { emails: [], total: 0 };
      keycloakService.getUserEmails.mockResolvedValue(resultData);

      const result = await controller.getUserEmails(query);

      expect(result).toEqual(resultData);
    });

    it('should use cached users when available (cache hit)', async () => {
      const query: UserQueryDto = {};
      const resultData = { emails: ['test@example.com'], total: 1 };
      keycloakService.getUserEmails.mockResolvedValue(resultData);

      const result = await controller.getUserEmails(query);

      expect(result).toEqual(resultData);
    });

    it('should cache users for 1 hour when fetched from service (cache miss)', async () => {
      const query: UserQueryDto = {};
      const resultData = { emails: ['test@example.com'], total: 1 };
      keycloakService.getUserEmails.mockResolvedValue(resultData);

      const result = await controller.getUserEmails(query);

      expect(result).toEqual(resultData);
    });

    it('should exclude users without attributes or MII_LOCATION', async () => {
      const query: UserQueryDto = {};
      const resultData = { emails: ['test@example.com'], total: 1 };
      keycloakService.getUserEmails.mockResolvedValue(resultData);

      const result = await controller.getUserEmails(query);

      expect(result).toEqual(resultData);
    });
  });

  describe('getUserByEmail', () => {
    it('should return user when found by email', async () => {
      const email = 'test@example.com';
      const emailParam = { email };
      const mockUsers = [mockUser];

      keycloakService.getUsers.mockResolvedValue(mockUsers);

      const result = await controller.getUserByEmail(emailParam);

      expect(keycloakService.getUsers).toHaveBeenCalledWith({ email, exact: true });
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      const email = 'notfound@example.com';
      const emailParam = { email };
      const mockUsers: IGetKeycloakUser[] = [];

      keycloakService.getUsers.mockResolvedValue(mockUsers);

      await expect(controller.getUserByEmail(emailParam)).rejects.toThrow(
        new NotFoundException(`User with email ${email} not found`),
      );

      expect(keycloakService.getUsers).toHaveBeenCalledWith({ email, exact: true });
    });

    it('should return first user when multiple users found with same email', async () => {
      const email = 'test@example.com';
      const emailParam = { email };
      const mockUser2 = { ...mockUser, id: '2' };
      const mockUsers = [mockUser, mockUser2];

      keycloakService.getUsers.mockResolvedValue(mockUsers);

      const result = await controller.getUserByEmail(emailParam);

      expect(keycloakService.getUsers).toHaveBeenCalledWith({ email, exact: true });
      expect(result).toEqual(mockUser); // Should return the first user
    });
  });
});
