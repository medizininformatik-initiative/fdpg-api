import { Expose } from 'class-transformer';
import { IsArray, IsEnum, IsOptional, MaxLength } from 'class-validator';
import { Department } from 'src/modules/proposal/enums/department.enum';
import { ProposalValidation } from 'src/modules/proposal/enums/porposal-validation.enum';
import { WithIdForObjectDto } from 'src/shared/dto/with-id-for-object.dto';
import { IsNotEmptyString } from 'src/shared/validators/is-not-empty-string.validator';

export class ProjectDetailsDto extends WithIdForObjectDto {
  @Expose()
  @MaxLength(10000)
  @IsNotEmptyString({ groups: [ProposalValidation.IsNotDraft] })
  @IsOptional({ groups: [ProposalValidation.IsDraft, ProposalValidation.IsDIFEDataSource] })
  simpleProjectDescription: string;

  @Expose()
  @IsArray()
  @IsEnum(Department, { each: true })
  @IsOptional({ groups: [ProposalValidation.IsDraft, ProposalValidation.IsDIFEDataSource] })
  department: Department[];

  @Expose()
  @MaxLength(10000)
  @IsNotEmptyString({ groups: [ProposalValidation.IsNotDraft] })
  @IsOptional({ groups: [ProposalValidation.IsDraft, ProposalValidation.IsDIFEDataSource] })
  scientificBackground: string;

  @Expose()
  @MaxLength(10000)
  @IsNotEmptyString({ groups: [ProposalValidation.IsNotDraft] })
  @IsOptional({ groups: [ProposalValidation.IsDraft, ProposalValidation.IsDIFEDataSource] })
  hypothesisAndQuestionProjectGoals: string;

  @Expose()
  @MaxLength(10000)
  @IsNotEmptyString({ groups: [ProposalValidation.IsNotDraft] })
  @IsOptional({ groups: [ProposalValidation.IsDraft, ProposalValidation.IsDIFEDataSource] })
  materialAndMethods: string;

  @Expose()
  @IsOptional()
  @MaxLength(10000)
  executiveSummaryUac: string;

  @Expose()
  @IsOptional()
  @MaxLength(10000)
  literature: string;

  @Expose()
  @IsOptional()
  @MaxLength(10000)
  biometric: string;
}
