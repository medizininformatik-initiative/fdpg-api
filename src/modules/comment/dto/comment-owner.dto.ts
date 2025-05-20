import { Exclude, Expose } from 'class-transformer';

import { MiiLocation } from 'src/shared/constants/mii-locations';
import { Role } from 'src/shared/enums/role.enum';
import { ValidationGroup } from '../enums/validation-group.enum';

@Exclude()
export class CommentOwnerDto {
  @Expose({ groups: [Role.FdpgMember, Role.DataSourceMember, ValidationGroup.IsOwnLocation] })
  miiLocation?: MiiLocation;

  @Expose()
  role?: Role;
}
