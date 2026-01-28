import { Expose } from 'class-transformer';
import { IsBoolean } from 'class-validator';
import { WithIdForObjectDto } from 'src/shared/dto/with-id-for-object.dto';

export class ProjectResponsibilityDto extends WithIdForObjectDto {
  @Expose()
  @IsBoolean()
  applicantIsProjectResponsible: boolean;
}
