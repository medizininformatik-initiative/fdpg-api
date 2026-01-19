import { Expose } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { UiWidget } from 'src/shared/decorators/ui-widget.decorator';
import { WithIdForObjectDto } from 'src/shared/dto/with-id-for-object.dto';

export class PropertyRightsDto extends WithIdForObjectDto {
  @Expose()
  @IsString()
  @IsOptional()
  @MaxLength(10000)
  @UiWidget({ type: 'richtext' })
  options?: string;
}
