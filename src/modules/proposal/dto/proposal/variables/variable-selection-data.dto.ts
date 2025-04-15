import { Expose } from 'class-transformer';
import { DifeTypeOfUse } from 'src/modules/proposal/enums/dife-type-of-use.enum';
import { IsEnum, MaxLength } from 'class-validator';
import { PlatformIdentifier } from 'src/modules/admin/enums/platform-identifier.enum';

export type VariableSelectionDto = Partial<
  Record<PlatformIdentifier, VariableSelectionDataDto | DifeVariableSelectionDataDto>
>;

export class VariableSelectionDataDto {}

export class DifeVariableSelectionDataDto {
  @Expose()
  @IsEnum(DifeTypeOfUse)
  typeOfUse?: DifeTypeOfUse;

  @Expose()
  @MaxLength(10_000)
  typeOfUseExplanation?: string;
}
