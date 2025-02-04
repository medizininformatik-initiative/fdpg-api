import { Exclude, Expose, Transform } from 'class-transformer';
import { IsBoolean, IsNumber, MaxLength, ValidateIf } from 'class-validator';
import { IsNotEmptyString } from 'src/shared/validators/is-not-empty-string.validator';

// For some reason the values are all strings so they need to be transformed to the desired type
@Exclude()
export class SetDizConditionApprovalDto {
  @Expose()
  @IsBoolean()
  @Transform((params) => (params.value === 'true' || params.value === true ? true : false))
  value: boolean;

  @Expose()
  @ValidateIf((obj: SetDizConditionApprovalDto) => obj.value === true)
  @IsNumber()
  @Transform((params) => {
    if (params.obj.value === 'false' || params.obj.value === false) {
      return undefined;
    }
    const parsed = parseFloat(params.value);
    return isNaN(parsed) ? undefined : parsed;
  })
  dataAmount?: number;

  @Expose()
  @ValidateIf(
    (obj: SetDizConditionApprovalDto) =>
      obj.value === true && typeof obj.conditionReasoning === 'string' && obj.conditionReasoning.trim() !== '',
  )
  @MaxLength(10_000)
  conditionReasoning?: string;

  @Expose()
  @ValidateIf((obj: SetDizConditionApprovalDto) => obj.value === false)
  @IsNotEmptyString()
  @MaxLength(10_000)
  declineReason?: string;
}
