import { Exclude, Expose } from 'class-transformer';
import { IsEmail, IsOptional } from 'class-validator';
import { IsNotEmptyString } from 'src/shared/validators/is-not-empty-string.validator';

@Exclude()
export class ResendInvitationDto {
  @Expose()
  @IsEmail()
  email: string;

  @Expose()
  @IsNotEmptyString()
  clientId: string;

  @Expose()
  @IsNotEmptyString()
  @IsOptional()
  redirectUri?: string;
}
