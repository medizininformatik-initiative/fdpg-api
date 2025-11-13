import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { CacheKey } from 'src/shared/enums/cache-key.enum';
import { Role } from 'src/shared/enums/role.enum';
import { KeycloakService } from './keycloak.service';
import { ICachedKeycloakUser, IGetKeycloakUser } from './types/keycloak-user.interface';
import { PlatformIdentifier } from '../admin/enums/platform-identifier.enum';
import { Proposal } from '../proposal/schema/proposal.schema';
import { ProposalWithoutContent } from '../event-engine/types/proposal-without-content.type';
import { UserQueryDto } from './dto/user-query.dto';
import { UserEmailResponseDto } from './dto/user-response.dto';

@Injectable()
export class KeycloakUtilService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private keycloakService: KeycloakService,
  ) {}

  /** Cache time in milliseconds (since v5) => 30 Minutes */
  private readonly ROLE_CACHE_TIME = 30 * 60 * 1000;

  /**
   * Get Valid Contacts based on email addresses
   * @param contacts email addressees that are supposed to be used
   * @returns distinct email addresses that are actually fully registered in keycloak
   */
  getValidContacts = async (contacts: string[], withFilterForReceivingMails = true): Promise<string[]> => {
    const validUsers = await this.keycloakService.getValidUsersByEmailSettled(contacts);
    return [
      ...new Set(
        validUsers
          .filter((user) => (withFilterForReceivingMails ? this.filterForReceivingEmail(user) : true))
          .map((user) => user.email),
      ),
    ];
  };

  /**
   * Get Valid Contacts based on userIds
   * @param userIds userIds that are supposed to be used
   * @returns email addresses that are actually fully registered in keycloak
   */
  getValidContactsByUserIds = async (userIds: string[], withFilterForReceivingMails = true): Promise<string[]> => {
    const validUsers = await this.keycloakService.getValidUsersByIdSettled(userIds);
    return validUsers
      .filter((user) => (withFilterForReceivingMails ? this.filterForReceivingEmail(user) : true))
      .map((user) => user.email);
  };

  /**
   * Filters users by location
   * @param locations Desired locations to be filtered against
   * @param members Keycloak users that should math the desired locations
   * @returns A subset of the users based on their locations
   */
  getLocationContacts(
    locations: string[],
    members: Pick<IGetKeycloakUser, 'attributes' | 'email'>[],
    withFilterForReceivingMails = true,
  ): string[] {
    const filtered = members.filter((member) => {
      const memberLocation = member.attributes?.MII_LOCATION?.[0];
      return memberLocation ? locations.includes(memberLocation) : false;
    });

    return filtered
      .filter((user) => (withFilterForReceivingMails ? this.filterForReceivingEmail(user) : true))
      .map((member) => member.email);
  }

  /** Returns all users with role FdpgMember */
  async getFdpgMembers(): Promise<ICachedKeycloakUser[]> {
    return await this.getMembers(Role.FdpgMember, CacheKey.AllFdpgMember, false);
  }

  /** Returns all users with role DataSourceMember and specific data source */
  async getDataSourceMembers(
    dataSource: PlatformIdentifier,
    withFilterForReceivingMails,
  ): Promise<ICachedKeycloakUser[]> {
    const dataSourceMembers: ICachedKeycloakUser[] = await this.getMembers(
      Role.DataSourceMember,
      CacheKey.AllDataSourceMembers,
      withFilterForReceivingMails,
    );

    const result = dataSourceMembers.filter((dataSourceMember) => {
      const assignedDataSources: PlatformIdentifier[] = (
        dataSourceMember.attributes?.assignedDataSources?.[0]?.split(';') ?? []
      )
        .map((raw) => raw.trim())
        .filter(Boolean)
        .map((token) => token.toUpperCase())
        .map((upper) => {
          const key = (Object.keys(PlatformIdentifier) as Array<keyof typeof PlatformIdentifier>).find(
            (k) => k.toUpperCase() === upper,
          );
          return key ? PlatformIdentifier[key] : undefined;
        })
        .filter((val): val is PlatformIdentifier => Boolean(val));

      return assignedDataSources.some((assignedDataSource) => assignedDataSource === dataSource);
    });

    return result;
  }

  async getFdpgMemberLevelContacts(
    proposal: Proposal | ProposalWithoutContent,
    withFilterForReceivingMails = true,
  ): Promise<ICachedKeycloakUser[]> {
    const validFdpgContacts = await this.getFdpgMembers();

    const dataSourceKeycloakContacts = await Promise.all(
      (proposal.selectedDataSources ?? []).map(
        async (dataSource) => await this.getDataSourceMembers(dataSource, false),
      ),
    );

    const dataSourceContacts = dataSourceKeycloakContacts.flatMap((dataSourceMembers) => dataSourceMembers);
    return Array.from(new Set([...validFdpgContacts, ...dataSourceContacts])).filter((user) =>
      withFilterForReceivingMails ? this.filterForReceivingEmail(user) : true,
    );
  }

  /** Returns all users with role DizMember */
  async getDizMembers(withFilterForReceivingMails = true): Promise<ICachedKeycloakUser[]> {
    return await this.getMembers(Role.DizMember, CacheKey.AllDizMember, withFilterForReceivingMails);
  }

  /** Returns all users with role UacMember */
  async getUacMembers(withFilterForReceivingMails = true): Promise<ICachedKeycloakUser[]> {
    return await this.getMembers(Role.UacMember, CacheKey.AllUacMember, withFilterForReceivingMails);
  }

  async getResearchers(withFilterForReceivingMails = true): Promise<ICachedKeycloakUser[]> {
    return await this.getMembers(Role.Researcher, CacheKey.AllResearchers, withFilterForReceivingMails);
  }

  async getDmsMembers(withFilterForReceivingMails = true): Promise<ICachedKeycloakUser[]> {
    return await this.getMembers(Role.DataManagementOffice, CacheKey.AllDmoUsers, withFilterForReceivingMails);
  }

  private async getMembers(
    role: Role,
    cacheKey: CacheKey,
    withFilterForReceivingMails = true,
  ): Promise<ICachedKeycloakUser[]> {
    let members: ICachedKeycloakUser[] = await this.cacheManager.get<ICachedKeycloakUser[]>(cacheKey);

    if (members && members.length > 0) {
      return members.filter((user) => (withFilterForReceivingMails ? this.filterForReceivingEmail(user) : true));
    }

    const memberFullModel = await this.keycloakService.getUsersByRole(role);
    members = memberFullModel.map(({ email, id, attributes }) => ({ email, id, attributes }));

    await this.cacheManager.set(cacheKey, members, this.ROLE_CACHE_TIME);
    return members.filter((user) => (withFilterForReceivingMails ? this.filterForReceivingEmail(user) : true));
  }

  filterForReceivingEmail(user: Pick<IGetKeycloakUser, 'attributes'>): boolean {
    const receiveEmailAttribute = user?.attributes?.receiveProposalEmails?.[0] ?? true;
    return typeof receiveEmailAttribute === 'string' ? receiveEmailAttribute === 'true' : receiveEmailAttribute;
  }

  private async getUsersForSearchQuerySearch(query: UserQueryDto): Promise<ICachedKeycloakUser[]> {
    if (query.roles && query.roles.length > 0) {
      const memberArray = await Promise.all(
        query.roles.map(async (role) => {
          switch (role) {
            case Role.DataSourceMember:
              if (!query.dataSources || query.dataSources.length === 0) {
                console.error('No data sources attached for search query');
                return [];
              }
              return (
                await Promise.all(query.dataSources.map(async (ds) => await this.getDataSourceMembers(ds, false)))
              ).flat();
            case Role.FdpgMember:
              return await this.getFdpgMembers();
            case Role.Researcher:
              return await this.getResearchers(false);
            case Role.DizMember:
              return await this.getDizMembers(false);
            case Role.UacMember:
              return await this.getUacMembers(false);
            case Role.DataManagementOffice:
              return await this.getDmsMembers(false);
            default:
              console.error(`Couldn't map role '${role}' on search query`);
              return [];
          }
        }),
      );

      const allMembers = memberArray.flat();

      const uniqueMemberMap = new Map();
      allMembers.forEach((member) => {
        uniqueMemberMap.set(member.email, member);
      });

      return [...uniqueMemberMap.values()];
    } else {
      let allUsers: ICachedKeycloakUser[] = await this.cacheManager.get<IGetKeycloakUser[]>(CacheKey.AllUsers);

      if (!allUsers) {
        // cache for 1 hour
        allUsers = await this.keycloakService.getUsers();
        const oneHourInMs = 60 * 60 * 1000;
        await this.cacheManager.set(CacheKey.AllUsers, allUsers, oneHourInMs);
      }

      return allUsers;
    }
  }

  async getUserEmails(query: UserQueryDto): Promise<UserEmailResponseDto> {
    const users = await this.getUsersForSearchQuerySearch(query);

    const lowerCasedSearch = query.startsWith?.toLowerCase();
    const emails = users.reduce<string[]>((acc, user) => {
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
