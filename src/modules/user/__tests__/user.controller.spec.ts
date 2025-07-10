import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { UserController } from '../user.controller';
import { KeycloakService } from '../keycloak.service';
import { KeycloakUtilService } from '../keycloak-util.service';
import { IGetKeycloakUser } from '../types/keycloak-user.interface';
import { UserQueryDto } from '../dto/user-query.dto';
import { KeycloakRequiredAction } from '../enums/keycloak-required-action.enum';
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
    });

    it('should get all user emails with default settings', async () => {
      const query: UserQueryDto = {};
      const mockUsers = [mockUser];

      keycloakService.getUsers.mockResolvedValue(mockUsers);
      keycloakUtilService.filterForReceivingEmail.mockReturnValue(true);

      const result = await controller.getUserEmails(query);

      expect(cacheManager.get).toHaveBeenCalled();
      expect(keycloakService.getUsers).toHaveBeenCalledWith();
      expect(cacheManager.set).toHaveBeenCalled();
      expect(keycloakUtilService.filterForReceivingEmail).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual({
        emails: ['test@example.com'],
        total: 1,
      });
    });

    it('should exclude users with unverified emails', async () => {
      const query: UserQueryDto = {};
      const unverifiedUser = { ...mockUser, emailVerified: false };
      const mockUsers = [mockUser, unverifiedUser];

      keycloakService.getUsers.mockResolvedValue(mockUsers);
      keycloakUtilService.filterForReceivingEmail.mockReturnValue(true);

      const result = await controller.getUserEmails(query);

      expect(result).toEqual({
        emails: ['test@example.com'],
        total: 1,
      });
    });

    it('should exclude users with required actions', async () => {
      const query: UserQueryDto = {};
      const userWithActions = { ...mockUser, requiredActions: [KeycloakRequiredAction.UpdatePassword] };
      const mockUsers = [mockUser, userWithActions];

      keycloakService.getUsers.mockResolvedValue(mockUsers);
      keycloakUtilService.filterForReceivingEmail.mockReturnValue(true);

      const result = await controller.getUserEmails(query);

      expect(result).toEqual({
        emails: ['test@example.com'],
        total: 1,
      });
    });

    it('should exclude users who disabled email notifications by default', async () => {
      const query: UserQueryDto = {};
      const mockUsers = [mockUser];

      keycloakService.getUsers.mockResolvedValue(mockUsers);
      keycloakUtilService.filterForReceivingEmail.mockReturnValue(false);

      const result = await controller.getUserEmails(query);

      expect(result).toEqual({
        emails: [],
        total: 0,
      });
    });

    it('should handle empty user list', async () => {
      const query: UserQueryDto = {};
      const mockUsers: IGetKeycloakUser[] = [];

      keycloakService.getUsers.mockResolvedValue(mockUsers);

      const result = await controller.getUserEmails(query);

      expect(result).toEqual({
        emails: [],
        total: 0,
      });
    });

    it('should handle multiple valid users', async () => {
      const query: UserQueryDto = {};
      const mockUser2 = { ...mockUser, id: '2', email: 'test2@example.com' };
      const mockUsers = [mockUser, mockUser2];

      keycloakService.getUsers.mockResolvedValue(mockUsers);
      keycloakUtilService.filterForReceivingEmail.mockReturnValue(true);

      const result = await controller.getUserEmails(query);

      expect(result).toEqual({
        emails: ['test@example.com', 'test2@example.com'],
        total: 2,
      });
    });

    it('should filter emails by startsWith parameter', async () => {
      const query: UserQueryDto = { startsWith: 'tes' };
      const mockUser2 = { ...mockUser, id: '2', email: 'other@example.com' };
      const mockUser3 = { ...mockUser, id: '3', email: 'test2@example.com' };
      const mockUsers = [mockUser, mockUser2, mockUser3];

      keycloakService.getUsers.mockResolvedValue(mockUsers);
      keycloakUtilService.filterForReceivingEmail.mockReturnValue(true);

      const result = await controller.getUserEmails(query);

      expect(result).toEqual({
        emails: ['test@example.com', 'test2@example.com'],
        total: 2,
      });
    });

    it('should filter emails by startsWith parameter case insensitive', async () => {
      const query: UserQueryDto = { startsWith: 'TES' };
      const mockUser2 = { ...mockUser, id: '2', email: 'OTHER@example.com' };
      const mockUser3 = { ...mockUser, id: '3', email: 'test2@example.com' };
      const mockUsers = [mockUser, mockUser2, mockUser3];

      keycloakService.getUsers.mockResolvedValue(mockUsers);
      keycloakUtilService.filterForReceivingEmail.mockReturnValue(true);

      const result = await controller.getUserEmails(query);

      expect(result).toEqual({
        emails: ['test@example.com', 'test2@example.com'],
        total: 2,
      });
    });

    it('should return empty array when no emails match startsWith parameter', async () => {
      const query: UserQueryDto = { startsWith: 'xyz' };
      const mockUsers = [mockUser];

      keycloakService.getUsers.mockResolvedValue(mockUsers);
      keycloakUtilService.filterForReceivingEmail.mockReturnValue(true);

      const result = await controller.getUserEmails(query);

      expect(result).toEqual({
        emails: [],
        total: 0,
      });
    });

    it('should use cached users when available (cache hit)', async () => {
      const query: UserQueryDto = {};
      const cachedUsers = [mockUser];

      cacheManager.get.mockResolvedValue(cachedUsers);
      keycloakUtilService.filterForReceivingEmail.mockReturnValue(true);

      const result = await controller.getUserEmails(query);

      expect(cacheManager.get).toHaveBeenCalledWith('CACHE_KEY_ALL_USERS');
      expect(keycloakService.getUsers).not.toHaveBeenCalled(); // Should not call service if cached
      expect(cacheManager.set).not.toHaveBeenCalled(); // Should not set cache if already cached
      expect(result).toEqual({
        emails: ['test@example.com'],
        total: 1,
      });
    });

    it('should cache users for 1 hour when fetched from service (cache miss)', async () => {
      const query: UserQueryDto = {};
      const mockUsers = [mockUser];

      // Mock cache miss
      cacheManager.get.mockResolvedValue(null);
      keycloakService.getUsers.mockResolvedValue(mockUsers);
      keycloakUtilService.filterForReceivingEmail.mockReturnValue(true);

      const result = await controller.getUserEmails(query);

      expect(cacheManager.get).toHaveBeenCalledWith('CACHE_KEY_ALL_USERS');
      expect(keycloakService.getUsers).toHaveBeenCalled();
      expect(cacheManager.set).toHaveBeenCalledWith('CACHE_KEY_ALL_USERS', mockUsers, 60 * 60 * 1000);
      expect(result).toEqual({
        emails: ['test@example.com'],
        total: 1,
      });
    });

    it('should exclude users without attributes or MII_LOCATION', async () => {
      const query: UserQueryDto = {};
      const userWithoutAttributes = { ...mockUser, attributes: undefined };
      const userWithEmptyAttributes = { ...mockUser, attributes: {} };
      const userWithoutLocation = { ...mockUser, attributes: { someOtherProp: 'value' } };
      const mockUsers = [mockUser, userWithoutAttributes, userWithEmptyAttributes, userWithoutLocation];

      keycloakService.getUsers.mockResolvedValue(mockUsers);
      keycloakUtilService.filterForReceivingEmail.mockReturnValue(true);

      const result = await controller.getUserEmails(query);

      // Only mockUser should pass all filters (has MII_LOCATION)
      expect(result).toEqual({
        emails: ['test@example.com'],
        total: 1,
      });
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
