import { Exclude, Expose, Transform, Type } from 'class-transformer';
import { IsArray, IsBoolean, IsMongoId, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Types } from 'mongoose';
import { IChecklist, IChecklistItem, IChecklistOption } from './checklist.types';
import { initChecklist } from '../../utils/checklist.utils';

class ChecklistOption implements IChecklistOption {
  @Expose()
  @IsString()
  optionValue: string;
}

class ChecklistItem implements IChecklistItem {
  @Expose()
  @IsMongoId()
  _id: Types.ObjectId;

  @Expose()
  @IsString()
  questionKey: string;

  @Expose()
  @IsOptional()
  @IsString()
  comment: string | null;

  @Expose()
  @IsBoolean()
  isMultiple: boolean;

  @Expose()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistOption)
  options: ChecklistOption[];

  @Expose()
  @IsArray()
  @IsString({ each: true })
  answer: string[];

  @Expose()
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ChecklistItem)
  sublist?: ChecklistItem[];

  @Expose()
  @IsBoolean()
  isAnswered: boolean;
}

@Exclude()
export class FdpgChecklistGetDto implements IChecklist {
  @Expose()
  @Transform((params) => (params.value === undefined ? false : params.value))
  isRegistrationLinkSent: boolean;

  @Expose()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistItem)
  checkListVerification: ChecklistItem[];

  @Expose()
  @IsString()
  fdpgInternalCheckNotes: string | null;

  @Expose()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistItem)
  projectProperties: ChecklistItem[];
}

@Exclude()
export class FdpgChecklistUpdateDto implements Partial<IChecklist> {
  @Expose()
  @IsOptional()
  @IsBoolean()
  isRegistrationLinkSent?: boolean;

  @Expose()
  @IsOptional()
  @IsMongoId()
  _id?: Types.ObjectId;

  @Expose()
  @IsOptional()
  @IsString()
  questionKey?: string;

  @Expose()
  @IsOptional()
  @IsBoolean()
  isMultiple?: boolean;

  @Expose()
  @IsOptional()
  @IsString()
  fdpgInternalCheckNotes?: string | null;

  @Expose()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistOption)
  options?: ChecklistOption[];

  @Expose()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  answer?: string[];

  @Expose()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistItem)
  sublist?: ChecklistItem[];

  @Expose()
  @IsOptional()
  @IsBoolean()
  isAnswered?: boolean;

  @Expose()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistItem)
  projectProperties?: ChecklistItem[];
}

@Exclude()
export class FdpgChecklistSetDto implements IChecklist {
  @Expose()
  @IsBoolean()
  isRegistrationLinkSent: boolean;

  @Expose()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistItem)
  checkListVerification: ChecklistItem[];

  @Expose()
  @IsString()
  fdpgInternalCheckNotes: string | null;

  @Expose()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistItem)
  projectProperties: ChecklistItem[];
}

export { initChecklist };
