import { Exclude, Expose, Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

@Exclude()
export class FdpgChecklistGetDto {
  @Expose()
  @Transform((params) => (params.value === undefined ? false : params.value))
  isRegistrationLinkSent: boolean;

  @Expose()
  @Transform((params) => (params.value === undefined ? false : params.value))
  isUnique: boolean;

  @Expose()
  @Transform((params) => (params.value === undefined ? false : params.value))
  isAttachmentsChecked: boolean;

  @Expose()
  @Transform((params) => (params.value === undefined ? false : params.value))
  isChecked: boolean;
}

@Exclude()
export class FdpgChecklistSetDto {
  @Expose()
  @IsOptional()
  @IsBoolean()
  isRegistrationLinkSent?: boolean;

  @Expose()
  @IsOptional()
  @IsBoolean()
  isUnique?: boolean;

  @Expose()
  @IsOptional()
  @IsBoolean()
  isAttachmentsChecked?: boolean;

  @Expose()
  @IsOptional()
  @IsBoolean()
  isChecked?: boolean;
}

export const initChecklist = (dbChecklist: any) => {
  return {
    isRegistrationLinkSent: false,
    isUnique: false,
    isAttachmentsChecked: false,
    isChecked: false,
    ...dbChecklist,
  } as FdpgChecklistGetDto;
};
