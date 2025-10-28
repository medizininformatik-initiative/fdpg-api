import { Expose } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class RegisterInfoDto {
  @Expose()
  @IsBoolean()
  @IsOptional()
  isRegisteringForm?: boolean;

  @Expose()
  @IsBoolean()
  @IsOptional()
  isInternalRegistration?: boolean;

  @Expose()
  @IsString()
  @IsOptional()
  originalProposalId?: string;
}
