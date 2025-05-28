import { DifeSelectionOfCasesDto } from './dife-selection-of-cases.dto';
import { Expose, Type } from 'class-transformer';
import { IsObject, IsOptional, ValidateNested } from 'class-validator';
import { PlatformIdentifier } from 'src/modules/admin/enums/platform-identifier.enum';
import { ExposeForDataSources } from 'src/shared/decorators/data-source.decorator';

export class SelectionOfCasesDto {
  @Expose()
  @IsObject()
  @IsOptional()
  @Type(() => DifeSelectionOfCasesDto)
  @ValidateNested()
  @ExposeForDataSources([PlatformIdentifier.DIFE])
  difeSelectionOfCases: DifeSelectionOfCasesDto;
}
