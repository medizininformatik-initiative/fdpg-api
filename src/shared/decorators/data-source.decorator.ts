import { Transform, TransformFnParams } from 'class-transformer';
import { PlatformIdentifier } from 'src/modules/admin/enums/platform-identifier.enum';
import { SharedValidationGroup } from '../enums/validation-group.enum';
import { Role } from '../enums/role.enum';

export function ExposeForDataSources(
  allowedDataSources: PlatformIdentifier[],
  restrictedForRoles = [Role.FdpgMember, Role.DataSourceMember, Role.UacMember, Role.DizMember],
) {
  return Transform(
    ({ value, options }: TransformFnParams) => {
      if (allowedDataSources.length === 0) {
        return value;
      }

      const allowedDataSourcesSet = new Set<string>(allowedDataSources.map((ds) => ds.toString()));
      const restrictedForRolesSet = new Set<string>(restrictedForRoles.map((ds) => ds.toString()));

      const groups = options.groups ?? [];

      const hasRestrictiveAccess = groups.some((group) => {
        const raw = group.replace(SharedValidationGroup.UserRole, '');
        return restrictedForRolesSet.has(raw);
      });

      if (!hasRestrictiveAccess) {
        return value;
      }

      const hasAccess = groups.some((group) => {
        const raw = group.replace(SharedValidationGroup.UserDataSource, '');
        return allowedDataSourcesSet.has(raw);
      });

      return hasAccess ? value : undefined;
    },
    { toClassOnly: true },
  );
}
