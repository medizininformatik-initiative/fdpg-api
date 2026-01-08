import { Expose } from 'class-transformer';
import { IsBoolean, ValidateNested } from 'class-validator';
import { WithIdForObjectDto } from 'src/shared/dto/with-id-for-object.dto';
import { PublicationDto } from './publication.dto';
import { UiNested, UiWidget } from 'src/shared/decorators/ui-widget.decorator';

export class PlannedPublicationDto extends WithIdForObjectDto {
  @Expose()
  @ValidateNested()
  @UiNested(() => PublicationDto, { isArray: true })
  publications: PublicationDto[];

  @Expose()
  @IsBoolean()
  @UiWidget({ type: 'checkbox' })
  noPublicationPlanned: boolean = false;
}
