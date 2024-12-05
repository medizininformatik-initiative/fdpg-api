import { Expose, Type } from 'class-transformer';
import { IsBoolean, IsDate, IsOptional, MaxLength, ValidateIf, Equals } from 'class-validator';
import { ProposalValidation } from 'src/modules/proposal/enums/porposal-validation.enum';
import { WithIdForObjectDto } from 'src/shared/dto/with-id-for-object.dto';
import { IsNotEmptyString } from 'src/shared/validators/is-not-empty-string.validator';

export class EthicVoteDto extends WithIdForObjectDto {
  @Expose()
  @IsBoolean()
  @IsOptional({ groups: [ProposalValidation.IsDraft] })
  isExisting: boolean;

  @Expose()
  @IsOptional({ groups: [ProposalValidation.IsDraft] })
  @ValidateIf((ethicVote: EthicVoteDto) => ethicVote.isExisting)
  @Equals(true)
  admitReputationOfAttachment: boolean;

  @Expose()
  @MaxLength(10000)
  @IsNotEmptyString({ groups: [ProposalValidation.IsNotDraft] })
  @IsOptional({ groups: [ProposalValidation.IsDraft] })
  @ValidateIf((ethicVote: EthicVoteDto) => ethicVote.isExisting)
  ethicsCommittee: string;

  @Expose()
  @IsNotEmptyString({ groups: [ProposalValidation.IsNotDraft] })
  @IsOptional({ groups: [ProposalValidation.IsDraft] })
  @ValidateIf((ethicVote: EthicVoteDto) => ethicVote.isExisting)
  ethicsVoteNumber: string;

  @Expose()
  @Type(() => Date)
  @IsDate()
  @ValidateIf((ethicVote: EthicVoteDto) => ethicVote.isExisting)
  @IsOptional({ groups: [ProposalValidation.IsDraft] })
  voteFromDate: Date;
}
