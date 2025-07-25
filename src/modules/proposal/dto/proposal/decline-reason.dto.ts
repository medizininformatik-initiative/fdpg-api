import { Exclude, Expose } from 'class-transformer';
import { MiiLocation } from 'src/shared/constants/mii-locations';
import { Owner } from 'src/shared/schema/owner.schema';
import { DeclineType } from '../../enums/decline-type.enum';

@Exclude()
export class DeclineReasonDto {
  @Expose()
  type: DeclineType;

  @Expose()
  reason: string;

  @Expose()
  location: MiiLocation;

  @Exclude()
  owner?: Owner;

  @Expose()
  createdAt: Date;

  @Expose()
  isLate?: boolean;
}
