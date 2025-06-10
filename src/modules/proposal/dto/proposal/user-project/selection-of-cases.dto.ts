import { DifeSelectionOfCasesDto } from './dife-selection-of-cases.dto';
import { Expose, Type } from 'class-transformer';
import { IsObject, IsOptional, ValidateIf, ValidateNested } from 'class-validator';
import { PlatformIdentifier } from 'src/modules/admin/enums/platform-identifier.enum';
import { ProposalValidation } from 'src/modules/proposal/enums/porposal-validation.enum';
import { ExposeForDataSources } from 'src/shared/decorators/data-source.decorator';
import { WithIdForObjectDto } from 'src/shared/dto/with-id-for-object.dto';

export class SelectionOfCasesDto extends WithIdForObjectDto {
  @Expose()
  @IsObject()
  @IsOptional({ groups: [ProposalValidation.IsDraft] })
  @Type(() => DifeSelectionOfCasesDto)
  @ValidateNested()
  @ExposeForDataSources([PlatformIdentifier.DIFE])
  @ValidateIf((o, context) => {
    const proposal = context?.object;
    return proposal?.selectedDataSources?.includes(PlatformIdentifier.DIFE);
  })
  difeSelectionOfCases: DifeSelectionOfCasesDto;
}
