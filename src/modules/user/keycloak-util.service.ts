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
  async getDataSourceMembers(dataSource: PlatformIdentifier): Promise<ICachedKeycloakUser[]> {
    let dataSourceMembers: ICachedKeycloakUser[] = await this.cacheManager.get<ICachedKeycloakUser[]>(
      CacheKey.AllDataSourceMembers,
    );

    if (dataSourceMembers && dataSourceMembers.length > 0) {
      return dataSourceMembers;
    }

    const dataSourceMembersFullModel = await this.keycloakService.getUsersByRole(Role.DataSourceMember);
    dataSourceMembers = dataSourceMembersFullModel.map(({ email, id, attributes }) => ({ email, id, attributes }));

    await this.cacheManager.set(CacheKey.AllDataSourceMembers, dataSourceMembers, this.ROLE_CACHE_TIME);

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
      (proposal.selectedDataSources ?? []).map(async (dataSource) => await this.getDataSourceMembers(dataSource)),
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

  async getDmoMembers(withFilterForReceivingMails = true): Promise<ICachedKeycloakUser[]> {
    return this.getMembers(Role.DataManagementOffice, CacheKey.AllDmoUsers, withFilterForReceivingMails);
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
}
