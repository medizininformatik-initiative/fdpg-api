import { Expose } from 'class-transformer';
import { IsString } from 'class-validator';
import { Role } from '../enums/role.enum';
import { IsNotEmptyString } from '../validators/is-not-empty-string.validator';

export class OwnerDto {
  @Expose()
  @IsNotEmptyString()
  id: string;

  @Expose()
  @IsString()
  firstName: string;

  @Expose()
  @IsString()
  lastName: string;

  @Expose()
  @IsString()
  email: string;

  @Expose()
  username?: string;

  @Expose()
  miiLocation?: string;

  @Expose()
  role?: Role;
}
