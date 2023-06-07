import { Role } from 'src/shared/enums/role.enum';

export interface IKeycloakRole {
  name: Role;
  containerId: string;
  id: string;
  composite?: boolean;
  clientRole?: boolean;
}
