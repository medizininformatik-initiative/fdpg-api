import { Expose } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsArray } from 'class-validator';
import { ProposalValidation } from 'src/modules/proposal/enums/porposal-validation.enum';
import { WithIdForArrayDto } from 'src/shared/dto/with-id-for-array.dto';
import { IsNotEmptyString } from 'src/shared/validators/is-not-empty-string.validator';
import { BiosampleType } from 'src/modules/proposal/enums/biosample-type.enum';
import { BiosampleCode } from 'src/modules/proposal/enums/biosample-code.enum';
import { MaxLengthHtml } from 'src/shared/validators/max-length-html.validator';
import { UiWidget } from 'src/shared/decorators/ui-widget.decorator';

export class BiosampleDto extends WithIdForArrayDto {
  @Expose()
  @IsEnum(BiosampleType, { groups: [ProposalValidation.IsNotDraft] })
  @IsOptional({ groups: [ProposalValidation.IsDraft] })
  @UiWidget({ type: 'select', format: 'single' })
  type: BiosampleType;

  @Expose()
  @IsNotEmptyString({ groups: [ProposalValidation.IsNotDraft] })
  @IsOptional({ groups: [ProposalValidation.IsDraft] })
  @UiWidget({ type: 'richtext' })
  typeDetails: string;

  @Expose()
  @IsNotEmptyString({ groups: [ProposalValidation.IsNotDraft] })
  @IsOptional({ groups: [ProposalValidation.IsDraft] })
  @MaxLengthHtml(10000)
  @UiWidget({ type: 'textfield', format: 'number' })
  count: string;

  @Expose()
  @IsNotEmptyString({ groups: [ProposalValidation.IsNotDraft] })
  @IsOptional({ groups: [ProposalValidation.IsDraft] })
  @MaxLengthHtml(10000)
  @UiWidget({ type: 'richtext' })
  parameter: string;

  @Expose()
  @IsNotEmptyString({ groups: [ProposalValidation.IsNotDraft] })
  @IsOptional({ groups: [ProposalValidation.IsDraft] })
  @MaxLengthHtml(10000)
  @UiWidget({ type: 'richtext' })
  requirements: string;

  @Expose()
  @IsBoolean()
  @IsOptional()
  @UiWidget({ type: 'checkbox' })
  optionalBiosample: boolean = false;

  @Expose()
  @IsArray()
  @IsEnum(BiosampleCode, { each: true, groups: [ProposalValidation.IsNotDraft] })
  @IsOptional({ groups: [ProposalValidation.IsDraft] })
  @UiWidget({ type: 'select', format: 'multiple' })
  sampleCode: BiosampleCode[];

  @Expose()
  @IsNotEmptyString()
  @IsOptional()
  @MaxLengthHtml(10000)
  @UiWidget({ type: 'richtext' })
  [BiosampleCode.SNOMED]?: string;

  @Expose()
  @IsNotEmptyString()
  @IsOptional()
  @MaxLengthHtml(10000)
  @UiWidget({ type: 'richtext' })
  [BiosampleCode.SPREC]?: string;

  @Expose()
  @IsNotEmptyString({ groups: [ProposalValidation.IsNotDraft] })
  @IsOptional({ groups: [ProposalValidation.IsDraft] })
  @MaxLengthHtml(3000)
  @UiWidget({ type: 'richtext' })
  method: string;

  @Expose()
  @IsBoolean()
  @IsOptional()
  @UiWidget({ type: 'checkbox' })
  externalLabTransfer: boolean = false;

  @Expose()
  @IsNotEmptyString()
  @IsOptional()
  @MaxLengthHtml(1000)
  @UiWidget({ type: 'richtext' })
  externalLabTransferDetails: string;
}
