import { Exclude, Expose } from 'class-transformer';
import { MiiLocation } from 'src/shared/constants/mii-locations';
import { ExposeId } from 'src/shared/decorators/transform/expose-id.decorator';

@Exclude()
export class UacApprovalGetDto {
  @Expose()
  location: MiiLocation;

  @Expose()
  dataAmount: number;

  @Expose()
  isContractSigned?: boolean;

  @ExposeId()
  _id: string;

  @Expose()
  createdAt: Date;

  @Expose()
  signedAt?: Date;
}
