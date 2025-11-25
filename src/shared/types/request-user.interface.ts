import { PlatformIdentifier } from '../../modules/admin/enums/platform-identifier.enum';
import { Role } from '../enums/role.enum';

export interface IRequestUser {
  userId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  username: string;
  email_verified: boolean;
  roles: Role[];

  /** Just one role that is relevant for the domain (not including the admin) */
  singleKnownRole?: Role;

  miiLocation?: string;

  /** If UAC OR DIZ Member */
  isFromLocation: boolean;

  /** If the location is present and known (MII Location) */
  isKnownLocation: boolean;

  /** If the location is currently set to inactive*/
  isInactiveLocation: boolean;

  assignedDataSources: PlatformIdentifier[];
}

export type FdpgRequest = Request & { user: IRequestUser };
