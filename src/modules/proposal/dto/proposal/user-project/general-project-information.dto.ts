import { Expose, Transform } from 'class-transformer';
import { IsArray, IsBoolean, IsDate, IsNumber, IsOptional, MaxLength, ValidateIf } from 'class-validator';
import { ProposalValidation } from 'src/modules/proposal/enums/porposal-validation.enum';
import { WithIdForObjectDto } from 'src/shared/dto/with-id-for-object.dto';
import { IsNotEmptyString } from 'src/shared/validators/is-not-empty-string.validator';
import { IsAfterToday } from 'src/shared/validators/is-after-today.validator';

export class GeneralProjectInformationDto extends WithIdForObjectDto {
  @Expose()
  @MaxLength(10000)
  @IsNotEmptyString({ groups: [ProposalValidation.IsNotDraft] })
  @IsOptional({ groups: [ProposalValidation.IsDraft, ProposalValidation.IsDIFEDataSource] })
  projectTitle: string;

  @Expose()
  @ValidateIf((o) => o.desiredStartTimeType === 'later')
  @Transform(({ value, obj }) => {
    if (obj.desiredStartTimeType === 'immediate') {
      return null;
    }
    return value ? new Date(value) : value;
  })
  @IsDate()
  @IsAfterToday({
    groups: [ProposalValidation.IsNotDraftAndNotRegister],
    // This validation only runs for non-draft AND non-register forms
  })
  @IsOptional({
    groups: [ProposalValidation.IsDraft, ProposalValidation.IsDIFEDataSource],
  })
  desiredStartTime: Date;

  @Expose()
  @IsNumber()
  @IsOptional({ groups: [ProposalValidation.IsDraft, ProposalValidation.IsDIFEDataSource] })
  projectDuration: number;

  @Expose()
  @MaxLength(10000)
  @IsNotEmptyString({ groups: [ProposalValidation.IsNotDraft] })
  @IsOptional({ groups: [ProposalValidation.IsDraft, ProposalValidation.IsDIFEDataSource] })
  projectFunding: string;

  @Expose()
  @MaxLength(100)
  @IsOptional()
  fundingReferenceNumber: string;

  @Expose()
  @IsNotEmptyString({ groups: [ProposalValidation.IsNotDraft] })
  @IsOptional({ groups: [ProposalValidation.IsDraft, ProposalValidation.IsDIFEDataSource] })
  desiredStartTimeType: string;

  @Expose()
  @IsArray()
  @IsOptional({ groups: [ProposalValidation.IsDraft, ProposalValidation.IsDIFEDataSource] })
  @IsNotEmptyString({ each: true, groups: [ProposalValidation.IsNotDraft] })
  keywords: string[];
}
