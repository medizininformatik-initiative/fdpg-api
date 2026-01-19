import { Expose } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';
import { IsNotEmptyString } from 'src/shared/validators/is-not-empty-string.validator';
import { ProposalValidation } from '../../enums/porposal-validation.enum';
import { WithIdForObjectDto } from 'src/shared/dto/with-id-for-object.dto';
import { SyncStatus } from '../../enums/sync-status.enum';
import { ProposalStatus } from '../../enums/proposal-status.enum';
import { UiWidget } from 'src/shared/decorators/ui-widget.decorator';

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
  @IsEnum(ProposalStatus)
  @IsOptional()
  originalProposalStatus?: ProposalStatus;

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

  // Sync fields (managed by system, not user input)
  @Expose()
  @IsEnum(SyncStatus)
  @IsOptional()
  syncStatus?: SyncStatus;

  @Expose()
  @IsOptional()
  lastSyncedAt?: Date;

  @Expose()
  @IsString()
  @IsOptional()
  lastSyncError?: string;

  @Expose()
  @IsNumber()
  @IsOptional()
  syncRetryCount?: number;

  @Expose()
  @IsString()
  @IsOptional()
  acptPluginId?: string;
}
