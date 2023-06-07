import { Expose } from 'class-transformer';
import { IsArray, IsEnum } from 'class-validator';
import { MiiLocation } from 'src/shared/constants/mii-locations';
import { WithIdForObjectDto } from 'src/shared/dto/with-id-for-object.dto';

export class AddresseesDto extends WithIdForObjectDto {
  @Expose()
  @IsArray()
  @IsEnum(MiiLocation, { each: true })
  desiredLocations: MiiLocation[];
}
