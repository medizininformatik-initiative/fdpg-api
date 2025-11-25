import { Exclude, Expose } from 'class-transformer';
import { Owner } from 'src/shared/schema/owner.schema';
import { DeclineType } from '../../enums/decline-type.enum';

@Exclude()
export class DeclineReasonDto {
  @Expose()
  type: DeclineType;

  @Expose()
  reason: string;

  @Expose()
  location: string;

  @Exclude()
  owner?: Owner;

  @Expose()
  createdAt: Date;

  @Expose()
  isLate?: boolean;
}
