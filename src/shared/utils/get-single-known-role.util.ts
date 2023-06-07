import { Role } from '../enums/role.enum';

/**
 * Returns just one role that is relevant for the domain.
 * Does not include the admin.
 * @param roles Roles of the user
 * @returns One role
 */
export const getSingleKnownRole = (roles: Role[]) => {
  if (roles.includes(Role.FdpgMember)) {
    return Role.FdpgMember;
  }
  if (roles.includes(Role.UacMember)) {
    return Role.UacMember;
  }
  if (roles.includes(Role.DizMember)) {
    return Role.DizMember;
  }
  if (roles.includes(Role.Researcher)) {
    return Role.Researcher;
  }

  return undefined;
};
