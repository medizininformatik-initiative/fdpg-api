import { Exclude, Expose } from 'class-transformer';
import { IsEnum } from 'class-validator';
import { MiiLocation } from 'src/shared/constants/mii-locations';

@Exclude()
export class RevertLocationVoteDto {
  @Expose()
  @IsEnum(MiiLocation)
  location: MiiLocation;
}
