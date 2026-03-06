import { Expose, Type } from 'class-transformer';
import { ArrayNotEmpty, IsBoolean, IsOptional, ValidateNested } from 'class-validator';
import { WithIdForObjectDto } from 'src/shared/dto/with-id-for-object.dto';
import { SelectedCohortDto } from './selected-cohort.dto';
import { ProposalValidation } from 'src/modules/proposal/enums/porposal-validation.enum';
import { MaxLengthOrUndefined } from 'src/shared/validators/max-length-or-undefined.validator';
export class CohortDto extends WithIdForObjectDto {
  @ValidateNested()
  @Type(() => SelectedCohortDto)
  @ArrayNotEmpty({ groups: [ProposalValidation.IsNotDraft] })
  @Expose()
  selectedCohorts: SelectedCohortDto[];

  @Expose()
  @IsOptional()
  @MaxLengthOrUndefined(10_000)
  details?: string;

  @Expose()
  @IsBoolean()
  @IsOptional()
  declare isDone?: boolean;
}
