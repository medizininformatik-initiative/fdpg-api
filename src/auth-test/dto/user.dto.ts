import { Role } from 'src/shared/enums/role.enum';

export class UserDto {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  roles: Role[] = [];
}
