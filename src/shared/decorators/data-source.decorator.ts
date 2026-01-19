import { Transform, TransformFnParams } from 'class-transformer';
import { PlatformIdentifier } from 'src/modules/admin/enums/platform-identifier.enum';
import { SharedValidationGroup } from '../enums/validation-group.enum';
import { Role } from '../enums/role.enum';

export function ExposeForDataSources(
  allowedDataSources: PlatformIdentifier[],
  restrictedForRoles = [Role.FdpgMember, Role.DataSourceMember],
) {
  return Transform(
    ({ value, options }: TransformFnParams) => {
      if (allowedDataSources.length === 0) {
        return value;
      }

      const selectedDataSources = [...((options as any).selectedDataSources || [])];

      if (!selectedDataSources || selectedDataSources.length === 0) {
        return value;
      }

      if (!allowedDataSources.some((ds) => selectedDataSources.includes(ds))) {
        return undefined;
      }

      const allowedDataSourcesSet = new Set<string>(allowedDataSources.map((ds) => ds.toString()));
      const restrictedForRolesSet = new Set<string>(restrictedForRoles.map((rfr) => rfr.toString()));

      const groups = options.groups ?? [];

      const hasRestrictiveAccess = groups.some((group) => {
        const raw = group.replace(SharedValidationGroup.UserRole + '_', '');
        return restrictedForRolesSet.has(raw);
      });

      if (!hasRestrictiveAccess) {
        return value;
      }
      const hasAccess = groups.some((group) => {
        const raw = group.replace(SharedValidationGroup.UserDataSource + '_', '');
        return allowedDataSourcesSet.has(raw);
      });

      return hasAccess ? value : undefined;
    },
    { toClassOnly: true },
  );
}
