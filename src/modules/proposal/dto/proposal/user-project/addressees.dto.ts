import { Expose } from 'class-transformer';
import { IsArray } from 'class-validator';
import { WithIdForObjectDto } from 'src/shared/dto/with-id-for-object.dto';

export class AddresseesDto extends WithIdForObjectDto {
  @Expose()
  @IsArray()
  desiredLocations: string[];
}
