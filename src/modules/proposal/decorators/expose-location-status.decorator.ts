import { Expose, ExposeOptions, Transform } from 'class-transformer';
import { parseGroupToUser } from 'src/shared/utils/user-group.utils';

import { getMostAdvancedState } from '../utils/validate-access.util';

export const ExposeLocationStatus = (options?: ExposeOptions) => (target: object, propertyKey: string) => {
  Expose(options)(target, propertyKey);
  Transform((params) => {
    try {
      const user = parseGroupToUser(params.options.groups);
      return getMostAdvancedState(params.obj, user);
    } catch {
      return undefined;
    }
  })(target, propertyKey);
};
