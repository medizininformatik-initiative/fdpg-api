import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { MiiLocation } from 'src/shared/constants/mii-locations';
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
  getValidContacts = async (contacts: string[]): Promise<string[]> => {
    const validUsers = await this.keycloakService.getValidUsersByEmailSettled(contacts);
    return [...new Set(validUsers.map((user) => user.email))];
  };

  /**
   * Get Valid Contacts based on userIds
   * @param userIds userIds that are supposed to be used
   * @returns email addresses that are actually fully registered in keycloak
   */
  getValidContactsByUserIds = async (userIds: string[]): Promise<string[]> => {
    const validUsers = await this.keycloakService.getValidUsersByIdSettled(userIds);
    return validUsers.map((user) => user.email);
  };

  /**
   * Filters users by location
   * @param locations Desired locations to be filtered against
   * @param members Keycloak users that should math the desired locations
   * @returns A subset of the users based on their locations
   */
  getLocationContacts(locations: MiiLocation[], members: Pick<IGetKeycloakUser, 'attributes' | 'email'>[]): string[] {
    const filtered = locations.includes(MiiLocation.VirtualAll)
      ? members
      : members.filter((member) => {
          const memberLocation = member.attributes?.MII_LOCATION?.[0];
          return memberLocation ? locations.includes(memberLocation) : false;
        });

    return filtered.map((member) => member.email);
  }

  /** Returns all users with role FdpgMember */
  async getFdpgMembers(): Promise<ICachedKeycloakUser[]> {
    let fdpgMember: ICachedKeycloakUser[] = await this.cacheManager.get<ICachedKeycloakUser[]>(CacheKey.AllFdpgMember);

    if (fdpgMember && fdpgMember.length > 0) {
      return fdpgMember;
    }

    const fdpgMemberFullModel = await this.keycloakService.getUsersByRole(Role.FdpgMember);
    fdpgMember = fdpgMemberFullModel.map(({ email, id, attributes }) => ({ email, id, attributes }));

    await this.cacheManager.set(CacheKey.AllFdpgMember, fdpgMember, this.ROLE_CACHE_TIME);
    return fdpgMember;
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

  async getFdpgMemberLevelContacts(proposal: Proposal | ProposalWithoutContent): Promise<ICachedKeycloakUser[]> {
    const validFdpgContacts = await this.getFdpgMembers();

    const dataSourceKeycloakContacts = await Promise.all(
      (proposal.selectedDataSources ?? []).map(async (dataSource) => await this.getDataSourceMembers(dataSource)),
    );

    const dataSourceContacts = dataSourceKeycloakContacts.flatMap((dataSourceMembers) => dataSourceMembers);
    return Array.from(new Set([...validFdpgContacts, ...dataSourceContacts]));
  }

  /** Returns all users with role DizMember */
  async getDizMembers(): Promise<ICachedKeycloakUser[]> {
    let dizMember: ICachedKeycloakUser[] = await this.cacheManager.get<ICachedKeycloakUser[]>(CacheKey.AllDizMember);

    if (dizMember && dizMember.length > 0) {
      return dizMember;
    }

    const dizMemberFullModel = await this.keycloakService.getUsersByRole(Role.DizMember);
    dizMember = dizMemberFullModel.map(({ email, id, attributes }) => ({ email, id, attributes }));

    await this.cacheManager.set(CacheKey.AllDizMember, dizMember, this.ROLE_CACHE_TIME);
    return dizMember;
  }

  /** Returns all users with role UacMember */
  async getUacMembers(): Promise<ICachedKeycloakUser[]> {
    let uacMember: ICachedKeycloakUser[] = await this.cacheManager.get<ICachedKeycloakUser[]>(CacheKey.AllUacMember);

    if (uacMember && uacMember.length > 0) {
      return uacMember;
    }

    const uacMemberFullModel = await this.keycloakService.getUsersByRole(Role.UacMember);
    uacMember = uacMemberFullModel.map(({ email, id, attributes }) => ({ email, id, attributes }));

    await this.cacheManager.set(CacheKey.AllUacMember, uacMember, this.ROLE_CACHE_TIME);
    return uacMember;
  }
}
