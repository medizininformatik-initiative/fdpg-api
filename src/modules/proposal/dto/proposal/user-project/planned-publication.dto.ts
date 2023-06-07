import { Expose, Type } from 'class-transformer';
import { IsBoolean, ValidateNested } from 'class-validator';
import { WithIdForObjectDto } from 'src/shared/dto/with-id-for-object.dto';
import { PublicationDto } from './publication.dto';

export class PlannedPublicationDto extends WithIdForObjectDto {
  @Expose()
  @ValidateNested()
  @Type(() => PublicationDto)
  publications: PublicationDto[];

  @Expose()
  @IsBoolean()
  noPublicationPlanned: boolean = false;
}
