import { Expose } from 'class-transformer';
import { IsArray, IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { IsNotEmptyString } from 'src/shared/validators/is-not-empty-string.validator';
import { ProposalValidation } from '../../enums/porposal-validation.enum';
import { WithIdForObjectDto } from 'src/shared/dto/with-id-for-object.dto';

export class RegisterInfoDto extends WithIdForObjectDto {
  @Expose()
  @IsBoolean()
  @IsOptional()
  isInternalRegistration?: boolean;

  @Expose()
  @IsString()
  @IsOptional()
  originalProposalId?: string;

  @Expose()
  @MaxLength(500)
  @IsOptional()
  @IsNotEmptyString({ groups: [ProposalValidation.IsRegister] })
  projectUrl?: string;

  @Expose()
  @IsBoolean()
  @IsOptional()
  legalBasis?: boolean;

  @Expose()
  @MaxLength(200)
  @IsOptional()
  @IsNotEmptyString({ groups: [ProposalValidation.IsRegister] })
  projectCategory?: string;

  @Expose()
  @IsArray()
  @IsOptional()
  @IsNotEmptyString({ each: true, groups: [ProposalValidation.IsRegister] })
  diagnoses?: string[];

  @Expose()
  @IsArray()
  @IsOptional()
  @IsNotEmptyString({ each: true, groups: [ProposalValidation.IsRegister] })
  procedures?: string[];
}
