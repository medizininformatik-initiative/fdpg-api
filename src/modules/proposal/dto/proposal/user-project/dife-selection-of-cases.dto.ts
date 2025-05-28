import { Expose } from 'class-transformer';
import { IsEnum, IsOptional } from 'class-validator';
import { DifeSelectionOfCasesEntries } from 'src/modules/proposal/enums/dife-selection-of-cases.enum';

export class DifeSelectionOfCasesDto {
  @Expose()
  @IsOptional()
  @IsEnum(DifeSelectionOfCasesEntries, { each: true })
  selectedCases: DifeSelectionOfCasesEntries[];

  @Expose()
  @IsOptional()
  otherExplanation?: string;
}
