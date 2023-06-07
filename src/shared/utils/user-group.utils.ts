import { SharedValidationGroup } from '../enums/validation-group.enum';
import { IRequestUser } from '../types/request-user.interface';

export type PartialUser = Pick<IRequestUser, 'userId' | 'singleKnownRole' | 'miiLocation'>;

export const convertUserToGroups = (user: IRequestUser): string[] => {
  const groups = [];
  groups.push(`${SharedValidationGroup.UserId}_${user.userId}`);
  groups.push(`${SharedValidationGroup.UserRole}_${user.singleKnownRole}`);

  if (user.miiLocation) {
    groups.push(`${SharedValidationGroup.UserLocation}_${user.miiLocation}`);
  }

  return groups;
};

export const parseGroupToUser = (groups: string[] = []): PartialUser => {
  return groups.reduce(
    (acc, group) => {
      if (group.startsWith(SharedValidationGroup.UserId)) {
        acc.userId = group.split(`${SharedValidationGroup.UserId}_`)[1];
      } else if (group.startsWith(SharedValidationGroup.UserLocation)) {
        acc.miiLocation = group.split(`${SharedValidationGroup.UserLocation}_`)[1];
      } else if (group.startsWith(SharedValidationGroup.UserRole)) {
        acc.singleKnownRole = group.split(`${SharedValidationGroup.UserRole}_`)[1];
      }
      return acc;
    },
    {
      userId: undefined,
      singleKnownRole: undefined,
      miiLocation: undefined,
    },
  );
};
