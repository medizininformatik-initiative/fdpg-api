import { Expose } from 'class-transformer';
import { IsNumber, IsOptional, MaxLength } from 'class-validator';
import { WithIdForObjectDto } from 'src/shared/dto/with-id-for-object.dto';
import { IsNotEmptyString } from 'src/shared/validators/is-not-empty-string.validator';
import { ProposalValidation } from '../../enums/porposal-validation.enum';
import { UiWidget } from 'src/shared/decorators/ui-widget.decorator';
import { MaxLengthHtml } from 'src/shared/validators/max-length-html.validator';

export class RequestedDataDto extends WithIdForObjectDto {
  @Expose()
  @IsNotEmptyString({ groups: [ProposalValidation.IsNotDraft] })
  @IsOptional({
    groups: [
      ProposalValidation.IsDraft,
      ProposalValidation.IsDIFEDataSource,
      ProposalValidation.IsRework,
      ProposalValidation.IsRegister,
    ],
  })
  @MaxLengthHtml(10000)
  @UiWidget({ type: 'richtext' })
  patientInfo: string;

  @Expose()
  @IsNotEmptyString({ groups: [ProposalValidation.IsNotDraft] })
  @IsOptional({
    groups: [
      ProposalValidation.IsDraft,
      ProposalValidation.IsDIFEDataSource,
      ProposalValidation.IsRework,
      ProposalValidation.IsRegister,
    ],
  })
  @MaxLengthHtml(10000)
  @UiWidget({ type: 'richtext' })
  dataInfo: string;

  @Expose()
  @IsNumber()
  @IsOptional({
    groups: [
      ProposalValidation.IsDraft,
      ProposalValidation.IsDIFEDataSource,
      ProposalValidation.IsRework,
      ProposalValidation.IsRegister,
    ],
  })
  @UiWidget({ type: 'textfield', format: 'number' })
  desiredDataAmount: number;

  @Expose()
  @IsNumber()
  @IsOptional({
    groups: [
      ProposalValidation.IsDraft,
      ProposalValidation.IsDIFEDataSource,
      ProposalValidation.IsRework,
      ProposalValidation.IsRegister,
    ],
  })
  @UiWidget({ type: 'textfield', format: 'number' })
  desiredControlDataAmount: number;
}
