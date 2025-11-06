import { Exclude, Expose } from 'class-transformer';
import { Role } from 'src/shared/enums/role.enum';
import { ValidationGroup } from '../enums/validation-group.enum';

@Exclude()
export class CommentOwnerDto {
  @Expose({ groups: [Role.FdpgMember, Role.DataSourceMember, ValidationGroup.IsOwnLocation] })
  miiLocation?: string;

  @Expose()
  role?: Role;
}
