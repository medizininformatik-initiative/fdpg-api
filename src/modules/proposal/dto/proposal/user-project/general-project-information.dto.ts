import { Expose, Type } from 'class-transformer';
import { IsArray, IsDate, IsNumber, IsOptional, MaxLength, ValidateIf } from 'class-validator';
import { ProposalValidation } from 'src/modules/proposal/enums/porposal-validation.enum';
import { WithIdForObjectDto } from 'src/shared/dto/with-id-for-object.dto';
import { IsNotEmptyString } from 'src/shared/validators/is-not-empty-string.validator';
import { IsAfterToday } from 'src/shared/validators/is-after-today.validator';

export class GeneralProjectInformationDto extends WithIdForObjectDto {
  @Expose()
  @MaxLength(10000)
  @IsNotEmptyString({ groups: [ProposalValidation.IsNotDraft] })
  @IsOptional({ groups: [ProposalValidation.IsDraft, ProposalValidation.IsDIFEDataSource] })
  projectTitle: string;

  @Expose()
  @Type(() => Date)
  @ValidateIf((o) => o.desiredStartTimeType === 'later')
  @IsDate()
  @IsAfterToday({ groups: [ProposalValidation.IsNotDraft] })
  @IsOptional({ groups: [ProposalValidation.IsDraft, ProposalValidation.IsDIFEDataSource] })
  desiredStartTime: Date;

  @Expose()
  @IsNumber()
  @IsOptional({ groups: [ProposalValidation.IsDraft, ProposalValidation.IsDIFEDataSource] })
  projectDuration: number;

  @Expose()
  @MaxLength(10000)
  @IsNotEmptyString({ groups: [ProposalValidation.IsNotDraft] })
  @IsOptional({ groups: [ProposalValidation.IsDraft, ProposalValidation.IsDIFEDataSource] })
  projectFunding: string;

  @Expose()
  @MaxLength(100)
  @IsOptional()
  fundingReferenceNumber: string;

  @Expose()
  @MaxLength(10000)
  @IsNotEmptyString({ groups: [ProposalValidation.IsNotDraft] })
  @IsOptional({ groups: [ProposalValidation.IsDraft, ProposalValidation.IsDIFEDataSource] })
  desiredStartTimeType: string;

  @Expose()
  @IsArray()
  @IsOptional({ groups: [ProposalValidation.IsDraft, ProposalValidation.IsDIFEDataSource] })
  @IsNotEmptyString({ each: true, groups: [ProposalValidation.IsNotDraft] })
  keywords: string[];
}
