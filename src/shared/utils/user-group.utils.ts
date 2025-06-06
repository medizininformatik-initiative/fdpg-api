import { SharedValidationGroup } from '../enums/validation-group.enum';
import { IRequestUser } from '../types/request-user.interface';

export type PartialUser = Pick<IRequestUser, 'userId' | 'singleKnownRole' | 'miiLocation' | 'assignedDataSources'>;

export const convertUserToGroups = (user: IRequestUser): string[] => {
  const groups = [];
  groups.push(`${SharedValidationGroup.UserId}_${user.userId}`);
  groups.push(`${SharedValidationGroup.UserRole}_${user.singleKnownRole}`);

  if (user.miiLocation) {
    groups.push(`${SharedValidationGroup.UserLocation}_${user.miiLocation}`);
  }

  if (user.assignedDataSources) {
    user.assignedDataSources.forEach((dataSource) =>
      groups.push(`${SharedValidationGroup.UserDataSource}_${dataSource}`),
    );
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
      } else if (group.startsWith(SharedValidationGroup.UserDataSource)) {
        acc.assignedDataSources.push(group.split(`${SharedValidationGroup.UserDataSource}_`)[1]);
      }
      return acc;
    },
    {
      userId: undefined,
      singleKnownRole: undefined,
      miiLocation: undefined,
      assignedDataSources: [],
    },
  );
};
