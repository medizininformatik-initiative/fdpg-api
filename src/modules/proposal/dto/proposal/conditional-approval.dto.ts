import { Expose } from 'class-transformer';
import { ExposeId } from 'src/shared/decorators/transform/expose-id.decorator';
import { Role } from 'src/shared/enums/role.enum';

export class ConditionalApprovalGetDto {
  @Expose()
  location: string;

  @Expose()
  isAccepted: boolean;

  @Expose()
  isDizAccepted: boolean;

  @Expose()
  isContractSigned?: boolean;

  @Expose()
  dataAmount: number;

  @Expose({ groups: [Role.FdpgMember, Role.DataSourceMember, Role.DizMember] })
  uploadId?: string;

  @Expose()
  conditionReasoning?: string;

  @ExposeId()
  _id: string;

  @Expose()
  createdAt: Date;

  @Expose()
  reviewedAt?: Date;

  @Expose()
  signedAt?: Date;

  @Expose()
  isLate?: boolean;
}
