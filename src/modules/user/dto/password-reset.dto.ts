import { Exclude, Expose } from 'class-transformer';
import { IsOptional } from 'class-validator';
import { IsNotEmptyString } from 'src/shared/validators/is-not-empty-string.validator';

@Exclude()
export class PasswordResetDto {
  @Expose()
  @IsNotEmptyString()
  clientId: string;

  @Expose()
  @IsNotEmptyString()
  @IsOptional()
  redirectUri?: string;
}
