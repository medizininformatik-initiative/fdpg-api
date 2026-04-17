import { Expose } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';
import { UiWidget } from 'src/shared/decorators/ui-widget.decorator';
import { WithIdForObjectDto } from 'src/shared/dto/with-id-for-object.dto';
import { MaxLengthHtml } from 'src/shared/validators/max-length-html.validator';

export class PropertyRightsDto extends WithIdForObjectDto {
  @Expose()
  @IsString()
  @IsOptional()
  @MaxLengthHtml(10000)
  @UiWidget({ type: 'richtext' })
  options?: string;
}
