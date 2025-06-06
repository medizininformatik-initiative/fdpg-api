import { Expose } from 'class-transformer';
import { isNumber, IsOptional } from 'class-validator';
import { ProposalValidation } from 'src/modules/proposal/enums/porposal-validation.enum';
import { WithIdForObjectDto } from 'src/shared/dto/with-id-for-object.dto';
import { isNotEmptyString } from 'src/shared/validators/is-not-empty-string.validator';
import { ValidateWhenEmpty } from 'src/shared/validators/validate-when-empty.validator';
import { MaxLengthOrUndefined } from 'src/shared/validators/max-length-or-undefined.validator';

export class FeasibilityDto extends WithIdForObjectDto {
  @Expose()
  @ValidateWhenEmpty(
    {
      otherField: 'details',
      validation: isNumber,
      otherFieldValidation: isNotEmptyString,
      defaultResetValue: undefined,
    },
    { groups: [ProposalValidation.IsNotDraft] },
  )
  @IsOptional({ groups: [ProposalValidation.IsDraft, ProposalValidation.IsDIFEDataSource] })
  id?: number;

  @Expose()
  @ValidateWhenEmpty(
    {
      otherField: 'id',
      validation: isNotEmptyString,
      otherFieldValidation: isNumber,
      defaultResetValue: undefined,
    },
    { groups: [ProposalValidation.IsNotDraft] },
  )
  @IsOptional({ groups: [ProposalValidation.IsDraft, ProposalValidation.IsDIFEDataSource] })
  @MaxLengthOrUndefined(10_000)
  details?: string;
}
