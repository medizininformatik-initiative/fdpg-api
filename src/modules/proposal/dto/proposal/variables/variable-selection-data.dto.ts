import { Expose, Type } from 'class-transformer';
import { DifeTypeOfUse } from 'src/modules/proposal/enums/dife-type-of-use.enum';
import { IsEnum, IsOptional, MaxLength, ValidateNested } from 'class-validator';
import { PlatformIdentifier } from 'src/modules/admin/enums/platform-identifier.enum';
import { ExposeForDataSources } from 'src/shared/decorators/data-source.decorator';
import { WithIdForObjectDto } from 'src/shared/dto/with-id-for-object.dto';
import { ProposalValidation } from 'src/modules/proposal/enums/porposal-validation.enum';
import { IsNotEmptyString } from 'src/shared/validators/is-not-empty-string.validator';

export class VariableSelectionDataDto extends WithIdForObjectDto {
  @ExposeForDataSources([PlatformIdentifier.DIFE])
  @ValidateNested()
  @IsOptional({ groups: [ProposalValidation.IsDraft, ProposalValidation.IsMiiDataSource] })
  @Type(() => DifeVariableSelectionDataDto)
  DIFE?: DifeVariableSelectionDataDto;
}

export class DifeVariableSelectionDataDto {
  @Expose()
  @IsEnum(DifeTypeOfUse)
  @IsOptional({ groups: [ProposalValidation.IsDraft] })
  typeOfUse?: DifeTypeOfUse;

  @Expose()
  @MaxLength(10_000)
  @IsNotEmptyString({ groups: [ProposalValidation.IsNotDraft] })
  @IsOptional({ groups: [ProposalValidation.IsDraft] })
  typeOfUseExplanation?: string;
}
