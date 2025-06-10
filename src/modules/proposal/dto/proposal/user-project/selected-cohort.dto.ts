import { Expose } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';
import { ProposalValidation } from 'src/modules/proposal/enums/porposal-validation.enum';
import { WithIdForArrayDto } from 'src/shared/dto/with-id-for-array.dto';
import { IsNotEmptyString } from 'src/shared/validators/is-not-empty-string.validator';

export class SelectedCohortDto extends WithIdForArrayDto {
  @Expose()
  @IsNumber()
  @IsOptional()
  feasibilityQueryId?: number;

  @Expose()
  @IsString()
  @IsNotEmptyString({ groups: [ProposalValidation.IsNotDraft] })
  @IsOptional({ groups: [ProposalValidation.IsDraft] })
  @MaxLength(1000)
  label: string;

  @Expose()
  @IsString()
  @IsOptional()
  @MaxLength(10000)
  comment?: string;

  @Expose()
  @IsString()
  @IsOptional()
  uploadId?: string;

  @Expose()
  @IsBoolean()
  isManualUpload?: boolean;
}
