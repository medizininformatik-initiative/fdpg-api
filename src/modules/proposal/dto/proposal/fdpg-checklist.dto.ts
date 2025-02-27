import { Exclude, Expose, Transform, Type } from 'class-transformer';
import { IsArray, IsBoolean, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Types } from 'mongoose';

class ChecklistOption {
  @Expose()
  @IsString()
  optionValue: string;
}

class ChecklistItem {
  @Expose()
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
  answer: string;

  @Expose()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistItem)
  sublist: ChecklistItem[];
}

@Exclude()
export class FdpgChecklistGetDto {
  @Expose()
  @Transform((params) => (params.value === undefined ? false : params.value))
  isRegistrationLinkSent: boolean;

  @Expose()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistItem)
  checkListVerification: ChecklistItem[];

  @Expose()
  @IsOptional()
  @IsString()
  fdpgInternalCheckNotes?: string;

  @Expose()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistItem)
  projectProperties: ChecklistItem[];
}

@Exclude()
export class FdpgChecklistUpdateDto {
  @Expose()
  @IsOptional()
  @IsBoolean()
  isRegistrationLinkSent?: boolean;

  @Expose()
  @IsOptional()
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
  fdpgInternalCheckNotes?: string;

  @Expose()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistOption)
  options?: ChecklistOption[];

  @Expose()
  @IsOptional()
  @IsArray()
  answer?: string | string[];

  @Expose()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistItem)
  sublist?: ChecklistItem[];

  @Expose()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistItem)
  projectProperties?: ChecklistItem[];
}

export const initChecklist = (dbChecklist: any = {}) => {
  return {
    isRegistrationLinkSent: false,
    fdpgInternalCheckNotes: null,
    checkListVerification: [
      {
        questionKey: 'DICpreCheck',
        comment: null,
        isMultiple: false,
        options: [{ optionValue: 'yes' }, { optionValue: 'no' }],
        answer: [],
        sublist: [],
      },
      {
        questionKey: 'titleUnique',
        comment: null,
        isMultiple: false,
        options: [{ optionValue: 'yes' }, { optionValue: 'no' }],
        answer: [],
        sublist: [],
      },
      {
        questionKey: 'realisticDuration',
        comment: null,
        isMultiple: false,
        options: [{ optionValue: 'yes' }, { optionValue: 'no' }],
        answer: [],
        sublist: [],
      },
      {
        questionKey: 'analysisPlanClear',
        comment: null,
        isMultiple: false,
        options: [{ optionValue: 'yes' }, { optionValue: 'no' }],
        answer: [],
        sublist: [],
      },
      {
        questionKey: 'exampleScriptsAttached',
        comment: null,
        isMultiple: false,
        options: [{ optionValue: 'yes' }, { optionValue: 'no' }],
        answer: [],
        sublist: [],
      },
      {
        questionKey: 'distributedAnalysis',
        comment: null,
        isMultiple: true,
        options: [
          { optionValue: 'distributedAnalysisDockerR' },
          { optionValue: 'distributedAnalysisDataSHIELD' },
          { optionValue: 'distributedAnalysisOther' },
        ],
        answer: [],
        sublist: [],
      },
    ],
    projectProperties: [
      {
        questionKey: 'NonMII-Project',
        comment: null,
        isMultiple: false,
        options: [{ optionValue: 'yes' }],
        answer: [],
      },
      {
        questionKey: 'NonGDNG-Project',
        comment: null,
        isMultiple: false,
        options: [{ optionValue: 'yes' }],
        answer: [],
      },
      {
        questionKey: 'HealthData-Project',
        comment: null,
        isMultiple: false,
        options: [{ optionValue: 'yes' }],
        answer: [],
      },
      {
        questionKey: 'Intl-Participants',
        comment: null,
        isMultiple: false,
        options: [{ optionValue: 'yes' }],
        answer: [],
      },
      {
        questionKey: 'Commercial-Participants',
        comment: null,
        isMultiple: false,
        options: [{ optionValue: 'yes' }],
        answer: [],
      },
      {
        questionKey: 'PartnerProject-Participants',
        comment: null,
        isMultiple: false,
        options: [{ optionValue: 'yes' }],
        answer: [],
      },
      {
        questionKey: 'LogicalPartner-DIC',
        comment: null,
        isMultiple: false,
        options: [{ optionValue: 'yes' }],
        answer: [],
      },
      {
        questionKey: 'Researcher-Support',
        comment: null,
        isMultiple: false,
        options: [{ optionValue: 'yes' }],
        answer: [],
      },
      {
        questionKey: 'DataIntegration',
        comment: null,
        isMultiple: false,
        options: [{ optionValue: 'yes' }],
        answer: [],
      },
      {
        questionKey: 'Biosamples-Requested',
        comment: null,
        isMultiple: false,
        options: [{ optionValue: 'yes' }],
        answer: [],
      },
      {
        questionKey: 'External-Lab',
        comment: null,
        isMultiple: false,
        options: [{ optionValue: 'yes' }],
        answer: [],
      },
    ],
    ...dbChecklist,
  };
};
