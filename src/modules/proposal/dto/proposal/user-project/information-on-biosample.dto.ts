import { Expose } from 'class-transformer';
import { ArrayNotEmpty, IsBoolean, IsString, IsOptional, ValidateNested } from 'class-validator';
import { ProposalValidation } from 'src/modules/proposal/enums/porposal-validation.enum';
import { WithIdForObjectDto } from 'src/shared/dto/with-id-for-object.dto';
import { BiosampleDto } from './biosample.dto';
import { MaxLengthHtml } from 'src/shared/validators/max-length-html.validator';
import { UiNested, UiWidget } from 'src/shared/decorators/ui-widget.decorator';

export class InformationOnRequestedBioSamples extends WithIdForObjectDto {
  @IsBoolean()
  @IsOptional()
  @Expose()
  @UiWidget({ type: 'checkbox' })
  noSampleRequired: boolean;

  @IsString()
  @IsOptional()
  @Expose()
  @MaxLengthHtml(10000)
  @UiWidget({ type: 'richtext' })
  laboratoryResources: string;

  @ValidateNested({ each: true })
  @UiNested(() => BiosampleDto, { isArray: true })
  @ArrayNotEmpty({ groups: [ProposalValidation.IsNotDraft] })
  @Expose()
  biosamples: BiosampleDto[];
}
