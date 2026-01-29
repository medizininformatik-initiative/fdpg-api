import { Expose, Transform } from 'class-transformer';
import { IsArray, IsDate, IsNumber, IsOptional, MaxLength, ValidateIf } from 'class-validator';
import { ProposalValidation } from 'src/modules/proposal/enums/porposal-validation.enum';
import { WithIdForObjectDto } from 'src/shared/dto/with-id-for-object.dto';
import { IsNotEmptyString } from 'src/shared/validators/is-not-empty-string.validator';
import { IsAfterToday } from 'src/shared/validators/is-after-today.validator';
import { UiWidget } from 'src/shared/decorators/ui-widget.decorator';

export class GeneralProjectInformationDto extends WithIdForObjectDto {
  @Expose()
  @MaxLength(10000)
  @IsNotEmptyString({ groups: [ProposalValidation.IsNotDraft] })
  @IsOptional({ groups: [ProposalValidation.IsDraft, ProposalValidation.IsDIFEDataSource] })
  @UiWidget({ type: 'textfield' })
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
  })
  @IsOptional({
    groups: [ProposalValidation.IsDraft, ProposalValidation.IsDIFEDataSource],
  })
  @UiWidget({ type: 'datepicker' })
  desiredStartTime: Date;

  @Expose()
  @IsNumber()
  @IsOptional({ groups: [ProposalValidation.IsDraft, ProposalValidation.IsDIFEDataSource] })
  @UiWidget({ type: 'textfield', format: 'number' })
  projectDuration: number;

  @Expose()
  @MaxLength(10000)
  @IsNotEmptyString({ groups: [ProposalValidation.IsNotDraft] })
  @IsOptional({ groups: [ProposalValidation.IsDraft, ProposalValidation.IsDIFEDataSource] })
  @UiWidget({ type: 'richtext' })
  projectFunding: string;

  @Expose()
  @MaxLength(100)
  @IsOptional()
  @UiWidget({ type: 'textfield' })
  fundingReferenceNumber: string;

  @Expose()
  @IsNotEmptyString({ groups: [ProposalValidation.IsNotDraft] })
  @IsOptional({
    groups: [ProposalValidation.IsDraft, ProposalValidation.IsDIFEDataSource, ProposalValidation.IsRegister],
  })
  @UiWidget({ type: 'select', format: 'single' })
  desiredStartTimeType: string;

  @Expose()
  @IsArray()
  @IsOptional({ groups: [ProposalValidation.IsDraft, ProposalValidation.IsDIFEDataSource] })
  @IsNotEmptyString({ each: true, groups: [ProposalValidation.IsNotDraft] })
  @UiWidget({ type: 'textfield', format: 'multiple' })
  keywords: string[];
}
