import { Exclude, Expose } from 'class-transformer';
import { ExposeId } from 'src/shared/decorators/transform/expose-id.decorator';

@Exclude()
export class UacApprovalGetDto {
  @Expose()
  location: string;

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

  @Expose()
  isLate?: boolean;
}
