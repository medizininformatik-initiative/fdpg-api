import { Expose } from 'class-transformer';
import { DifeTypeOfUse } from 'src/modules/proposal/enums/dife-type-of-use.enum';
import { IsEnum, MaxLength } from 'class-validator';
import { PlatformIdentifier } from 'src/modules/admin/enums/platform-identifier.enum';
import { ExposeForDataSources } from 'src/shared/decorators/data-source.decorator';

export type VariableSelectionDto = Partial<
  Record<PlatformIdentifier, VariableSelectionDataDto | DifeVariableSelectionDataDto>
>;

export class VariableSelectionDataDto {}

export class DifeVariableSelectionDataDto {
  @Expose()
  @IsEnum(DifeTypeOfUse)
  @ExposeForDataSources([PlatformIdentifier.DIFE])
  typeOfUse?: DifeTypeOfUse;

  @Expose()
  @MaxLength(10_000)
  @ExposeForDataSources([PlatformIdentifier.DIFE])
  typeOfUseExplanation?: string;
}
