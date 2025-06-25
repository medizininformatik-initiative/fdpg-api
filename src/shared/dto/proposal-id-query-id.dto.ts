import { Exclude, Expose } from 'class-transformer';
import { IsNumber, IsString } from 'class-validator';

@Exclude()
export class ProposalIdQueryIdDto {
  @Expose()
  @IsString()
  proposalId: string;

  @Expose()
  @IsNumber()
  queryId: number;
}
