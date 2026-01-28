import { Expose } from 'class-transformer';
import { IsEnum, IsOptional } from 'class-validator';
import { DifeSelectionOfCasesEntries } from 'src/modules/proposal/enums/dife-selection-of-cases.enum';
import { UiWidget } from 'src/shared/decorators/ui-widget.decorator';

export class DifeSelectionOfCasesDto {
  @Expose()
  @IsOptional()
  @IsEnum(DifeSelectionOfCasesEntries, { each: true })
  @UiWidget({ type: 'select', format: 'multiple' })
  selectedCases: DifeSelectionOfCasesEntries[];

  @Expose()
  @IsOptional()
  @UiWidget({ type: 'textfield' })
  otherExplanation?: string;
}
