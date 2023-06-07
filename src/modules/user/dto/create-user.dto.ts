import { Exclude, Expose } from 'class-transformer';
import { IsEmail, IsEnum, IsOptional } from 'class-validator';
import { MiiLocation } from 'src/shared/constants/mii-locations';
import { Role } from 'src/shared/enums/role.enum';
import { IsNotEmptyString } from 'src/shared/validators/is-not-empty-string.validator';

@Exclude()
export class CreateUserDto {
  @Expose()
  @IsEmail()
  email: string;

  @Expose()
  @IsNotEmptyString()
  username: string;

  @Expose()
  @IsNotEmptyString()
  firstName: string;

  @Expose()
  @IsNotEmptyString()
  lastName: string;

  @Expose()
  @IsEnum(Role)
  @IsOptional()
  role?: Role;

  @Expose()
  @IsEnum(MiiLocation)
  @IsOptional()
  location?: MiiLocation;

  @Expose()
  @IsNotEmptyString()
  clientId: string;

  @Expose()
  @IsNotEmptyString()
  @IsOptional()
  redirectUri?: string;
}
