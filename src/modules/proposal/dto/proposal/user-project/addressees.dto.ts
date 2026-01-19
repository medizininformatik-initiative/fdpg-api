import { Expose } from 'class-transformer';
import { IsArray } from 'class-validator';
import { UiWidget } from 'src/shared/decorators/ui-widget.decorator';
import { WithIdForObjectDto } from 'src/shared/dto/with-id-for-object.dto';

export class AddresseesDto extends WithIdForObjectDto {
  @Expose()
  @IsArray()
  @UiWidget({ type: 'select', format: 'multiple' })
  desiredLocations: string[];
}
