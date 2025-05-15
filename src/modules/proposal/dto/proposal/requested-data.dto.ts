import { Expose } from 'class-transformer';
import { IsNumber, IsOptional, MaxLength } from 'class-validator';
import { WithIdForObjectDto } from 'src/shared/dto/with-id-for-object.dto';
import { IsNotEmptyString } from 'src/shared/validators/is-not-empty-string.validator';
import { ProposalValidation } from '../../enums/porposal-validation.enum';

export class RequestedDataDto extends WithIdForObjectDto {
  @Expose()
  @IsNotEmptyString({ groups: [ProposalValidation.IsNotDraft] })
  @IsOptional({ groups: [ProposalValidation.IsDraft, ProposalValidation.IsDIFEDataSource] })
  @MaxLength(10000)
  patientInfo: string;

  @Expose()
  @IsNotEmptyString({ groups: [ProposalValidation.IsNotDraft] })
  @IsOptional({ groups: [ProposalValidation.IsDraft, ProposalValidation.IsDIFEDataSource] })
  @MaxLength(10000)
  dataInfo: string;

  @Expose()
  @IsNumber()
  @IsOptional({ groups: [ProposalValidation.IsDraft, ProposalValidation.IsDIFEDataSource] })
  desiredDataAmount: number;
}
