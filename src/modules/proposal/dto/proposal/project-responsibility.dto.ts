import { Expose } from 'class-transformer';
import { IsBoolean } from 'class-validator';
import { UiWidget } from 'src/shared/decorators/ui-widget.decorator';
import { WithIdForObjectDto } from 'src/shared/dto/with-id-for-object.dto';

export class ProjectResponsibilityDto extends WithIdForObjectDto {
  @Expose()
  @IsBoolean()
  @UiWidget({ type: 'checkbox' })
  applicantIsProjectResponsible: boolean;
}
