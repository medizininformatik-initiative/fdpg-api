import { Expose, Type } from 'class-transformer';
import { DifeTypeOfUse } from 'src/modules/proposal/enums/dife-type-of-use.enum';
import { IsEnum, IsObject, IsOptional, ValidateNested } from 'class-validator';
import { PlatformIdentifier } from 'src/modules/admin/enums/platform-identifier.enum';
import { ExposeForDataSources } from 'src/shared/decorators/data-source.decorator';
import { WithIdForObjectDto } from 'src/shared/dto/with-id-for-object.dto';
import { ProposalValidation } from 'src/modules/proposal/enums/porposal-validation.enum';
import { IsNotEmptyString } from 'src/shared/validators/is-not-empty-string.validator';
import { MaxLengthHtml } from 'src/shared/validators/max-length-html.validator';
import { UiNested, UiWidget } from 'src/shared/decorators/ui-widget.decorator';

export class DifeVariableSelectionDataDto {
  @Expose()
  @IsEnum(DifeTypeOfUse)
  @IsOptional({ groups: [ProposalValidation.IsDraft] })
  @UiWidget({ type: 'select', format: 'single' })
  typeOfUse?: DifeTypeOfUse;

  @Expose()
  @MaxLengthHtml(10_000)
  @IsNotEmptyString({ groups: [ProposalValidation.IsNotDraft] })
  @IsOptional({ groups: [ProposalValidation.IsDraft] })
  @UiWidget({ type: 'richtext' })
  typeOfUseExplanation?: string;
}

export class VariableSelectionDataDto extends WithIdForObjectDto {
  @ExposeForDataSources([PlatformIdentifier.DIFE])
  @ValidateNested()
  @IsOptional({ groups: [ProposalValidation.IsDraft, ProposalValidation.IsMiiDataSource] })
  @UiNested(() => DifeVariableSelectionDataDto)
  @IsObject()
  DIFE?: DifeVariableSelectionDataDto;
}
