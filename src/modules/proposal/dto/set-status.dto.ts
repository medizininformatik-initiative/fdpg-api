import { Exclude, Expose } from 'class-transformer';
import { IsBoolean, IsEnum } from 'class-validator';
import { ProposalStatus } from '../enums/proposal-status.enum';

@Exclude()
export class SetProposalStatusDto {
  @Expose()
  @IsEnum(ProposalStatus)
  value: ProposalStatus;
}

@Exclude()
export class SetBooleanStatusDto {
  @Expose()
  @IsBoolean()
  value: boolean;
}
