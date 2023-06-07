import { IRequestUser } from '../types/request-user.interface';

export const getOwner = (user: IRequestUser) => ({
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  username: user.username,
  id: user.userId,
  role: user.singleKnownRole,
  miiLocation: user.miiLocation,
});
