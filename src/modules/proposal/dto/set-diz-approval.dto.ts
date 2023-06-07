import { Exclude, Expose } from 'class-transformer';
import { IsBoolean, MaxLength, ValidateIf } from 'class-validator';
import { IsNotEmptyString } from 'src/shared/validators/is-not-empty-string.validator';

@Exclude()
export class SetDizApprovalDto {
  @Expose()
  @IsBoolean()
  value: boolean;

  @Expose()
  @ValidateIf((obj: SetDizApprovalDto) => obj.value === false)
  @IsNotEmptyString()
  @MaxLength(10_000)
  declineReason?: string;
}
