import {
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Cache } from 'cache-manager';
import { all, AxiosError, AxiosInstance } from 'axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { CacheKey } from 'src/shared/enums/cache-key.enum';
import { Role } from 'src/shared/enums/role.enum';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import { validate as isValidUuid } from 'uuid';
import { CreateUserDto } from './dto/create-user.dto';
import { PasswordResetDto } from './dto/password-reset.dto';
import { ResendInvitationDto } from './dto/resend-invitation.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { UserEmailResponseDto } from './dto/user-response.dto';
import { KeycloakLocale } from './enums/keycloak-locale.enum';
import { KeycloakRequiredAction } from './enums/keycloak-required-action.enum';
import { handleRegisterErrors, throwInvalidLocation } from './error-handling/create-user.errors';
import { handleActionsEmailError } from './error-handling/user-invite.errors';
import { KeycloakClient } from './keycloak.client';
import { IKeycloakActionsEmail } from './types/keycloak-actions-email.interface';
import { IKeycloakRole } from './types/keycloak-role-assignment.interface';
import { IKeycloakUserQuery } from './types/keycloak-user-query.interface';
import { ICreateKeycloakUser, IGetKeycloakUser } from './types/keycloak-user.interface';

@Injectable()
export class KeycloakService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private keycloakClient: KeycloakClient,
  ) {
    this.apiClient = this.keycloakClient.client;
  }

  private apiClient: AxiosInstance;

  async getUserById(userId: string): Promise<IGetKeycloakUser> {
    return await this.apiClient.get<IGetKeycloakUser>(`/users/${userId}`).then((result) => result.data);
  }

  async getUsers(query: IKeycloakUserQuery = {}): Promise<IGetKeycloakUser[]> {
    const params = {
      max: -1,
      ...query,
    };
    return await this.apiClient.get<IGetKeycloakUser[]>('/users', { params }).then((result) => result.data);
  }

  async getUsersByRole(role: Role): Promise<IGetKeycloakUser[]> {
    const params = {
      max: -1,
    };
    return await this.apiClient
      .get<IGetKeycloakUser[]>(`/roles/${role}/users`, { params })
      .then((result) => result.data);
  }

  async getValidUsersByEmailSettled(emails: string[]): Promise<IGetKeycloakUser[]> {
    const tasks = emails.map((email) => {
      if (email) {
        return this.getUsers({ email: email, exact: true });
      }
    });

    const results = await Promise.allSettled(tasks);

    return results.reduce((acc, result) => {
      if (result.status === 'fulfilled' && result.value.length > 0) {
        const user = result.value[0];
        const isEmailVerified = user.emailVerified;
        const hasRequiredActions = user.requiredActions.length > 0;
        if (isEmailVerified && !hasRequiredActions) {
          acc.push(user);
        }
      }
      return acc;
    }, [] as IGetKeycloakUser[]);
  }

  async getValidUsersByIdSettled(userIds: string[]): Promise<IGetKeycloakUser[]> {
    const tasks = userIds.map((userId) => {
      if (userId) {
        return this.getUserById(userId);
      }
    });

    const results = await Promise.allSettled(tasks);

    return results.reduce((acc, result) => {
      if (result.status === 'fulfilled' && result.value) {
        const user = result.value;
        const isEmailVerified = user.emailVerified;
        const hasRequiredActions = user.requiredActions.length > 0;
        if (isEmailVerified && !hasRequiredActions) {
          acc.push(user);
        }
      }
      return acc;
    }, [] as IGetKeycloakUser[]);
  }

  /** Creates a user in Keycloak and assigns a Role if required */
  async createUser(user: CreateUserDto): Promise<string | undefined> {
    const { role, clientId, redirectUri, location, ...rest } = user;
    const keycloakUser: ICreateKeycloakUser = {
      ...rest,
      username: rest.username,
      enabled: true,
      requiredActions: [KeycloakRequiredAction.UpdateProfile, KeycloakRequiredAction.UpdatePassword],
      attributes: {
        locale: [KeycloakLocale.De],
      },
    };

    if (role === Role.DizMember || role === Role.UacMember) {
      if (!location) {
        throwInvalidLocation();
      }

      keycloakUser.attributes.MII_LOCATION = [location];
      console.log(keycloakUser.attributes.MII_LOCATION);
    }

    const userId = await this.registerUser(keycloakUser);

    if (userId) {
      if (role) {
        await this.addRoleToUser(userId, role);
      }

      await this.executeActionsEmailForInvitation(userId, clientId, redirectUri);
    }

    return userId;
  }

  async updateProfile(userId: string, updateUserDto: UpdateUserDto, user: IRequestUser): Promise<void> {
    if (userId !== user.userId && user.singleKnownRole !== Role.FdpgMember) {
      throw new ForbiddenException(`UserId does not match the userId of the user requesting the action`);
    }

    try {
      const keycloakUser = await this.getUserById(userId);
      const mergedUser = updateUserDto.getMergedUser(keycloakUser);
      await this.apiClient.put<never>(`/users/${userId}`, mergedUser);
    } catch (error) {
      if (error instanceof AxiosError && error.response.status === 404) {
        throw new NotFoundException('Could not find user with userId: ' + userId);
      }
    }
  }

  /** Registers a user in Keycloak and returns the userId */
  async registerUser(user: ICreateKeycloakUser): Promise<string | undefined> {
    let userId: string;
    try {
      const result = await this.apiClient.post<IGetKeycloakUser>('/users', user);
      // UserId should be available through this response header
      userId = result.headers.location?.split('/').at(-1) ?? undefined;
    } catch (error) {
      handleRegisterErrors(error);
    }
    if (isValidUuid(userId)) {
      return userId;
    } else {
      // If userId was not available through the header, we try to get it
      const users = await this.getUsers({ username: user.username });
      const userIdFromList = users[0]?.id;
      return isValidUuid(userIdFromList) ? userIdFromList : undefined;
    }
  }

  async getAvailableRoles(): Promise<Map<Role, IKeycloakRole>> {
    let roleMap = await this.cacheManager.get<Map<Role, IKeycloakRole>>(CacheKey.AllRoles);

    if (roleMap) {
      return roleMap;
    }

    try {
      const result = await this.apiClient.get<IKeycloakRole[]>('/roles');
      const availableRoles = Object.values(Role);
      roleMap = new Map<Role, IKeycloakRole>();
      result.data.forEach((keycloakRole) => {
        if (availableRoles.includes(keycloakRole.name)) {
          roleMap.set(keycloakRole.name, keycloakRole);
        }
      });

      // Cache Time in milliseconds (since v5) => 30 Minutes
      const ttl = 30 * 60 * 1000;
      await this.cacheManager.set(CacheKey.AllRoles, roleMap, ttl);

      return roleMap;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException('Failed to fetch available roles from keycloak');
    }
  }

  async addRoleToUser(userId: string, role: Role): Promise<void> {
    const keycloakRoles = await this.getAvailableRoles();
    const roleAssignments: IKeycloakRole[] = [keycloakRoles.get(role)];
    try {
      await this.apiClient.post<never>(`/users/${userId}/role-mappings/realm`, roleAssignments);
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException('Failed to assign role to user in keycloak');
    }
  }

  async resendInvitation(resendInvitationDto: ResendInvitationDto): Promise<void> {
    const allUsersForEmail = await this.getUsers({ email: resendInvitationDto.email });
    const notFullyRegisteredUsers = allUsersForEmail.filter((user) => {
      const isEmailVerified = user.emailVerified;
      const hasRequiredActions = user.requiredActions.length > 0;
      return !isEmailVerified || hasRequiredActions;
    });

    if (notFullyRegisteredUsers.length <= 0) {
      throw new NotFoundException(`Users with email ${resendInvitationDto.email} are not registered`);
    }
    const tasks = notFullyRegisteredUsers.map((user) =>
      this.executeActionsEmailForInvitation(user.id, resendInvitationDto.clientId, resendInvitationDto.redirectUri),
    );
    await Promise.allSettled(tasks);
  }

  async executeActionsEmailForInvitation(userId: string, clientId: string, redirectUri: string): Promise<void> {
    const actions = [KeycloakRequiredAction.UpdateProfile, KeycloakRequiredAction.UpdatePassword];
    const params: IKeycloakActionsEmail = {
      client_id: clientId,
      redirect_uri: redirectUri,
      // => 7 Days
      lifespan: 7 * 24 * 60 * 60,
    };
    try {
      await this.apiClient.put<never>(`/users/${userId}/execute-actions-email`, actions, { params });
    } catch (error) {
      handleActionsEmailError(error);
    }
  }
  async executeActionsEmailForPassword(
    userId: string,
    passwordResetDto: PasswordResetDto,
    user: IRequestUser,
  ): Promise<void> {
    if (userId !== user.userId && user.singleKnownRole !== Role.FdpgMember) {
      throw new ForbiddenException(`UserId does not match the userId of the user requesting the action`);
    }
    const actions = [KeycloakRequiredAction.UpdatePassword];
    const params: IKeycloakActionsEmail = {
      client_id: passwordResetDto.clientId,
      redirect_uri: passwordResetDto.redirectUri,
      // => 5 Minutes
      lifespan: 5 * 60,
    };
    try {
      await this.apiClient.put<never>(`/users/${userId}/execute-actions-email`, actions, { params });
    } catch (error) {
      handleActionsEmailError(error);
    }
  }

  async getUserEmails(query: UserQueryDto): Promise<UserEmailResponseDto> {
    let allUsers: IGetKeycloakUser[] = await this.cacheManager.get<IGetKeycloakUser[]>(CacheKey.AllUsers);

    if (!allUsers) {
      // cache for 1 hour
      allUsers = await this.getUsers();
      const oneHourInMs = 60 * 60 * 1000;
      await this.cacheManager.set(CacheKey.AllUsers, allUsers, oneHourInMs);
    }

    const lowerCasedSearch = query.startsWith?.toLowerCase();
    const emails = allUsers.reduce<string[]>((acc, user) => {
      if (!user.emailVerified || user.requiredActions.length > 0) {
        return acc;
      }
      if (!user.attributes?.MII_LOCATION) {
        return acc;
      }
      if (lowerCasedSearch && !user.email.toLowerCase().startsWith(lowerCasedSearch)) {
        return acc;
      }
      acc.push(user.email);

      return acc;
    }, []);

    return {
      emails,
      total: emails.length,
    };
  }
}
