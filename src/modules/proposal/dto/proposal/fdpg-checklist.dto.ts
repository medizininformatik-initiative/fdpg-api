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
  @IsBoolean()
  isAnswered: boolean;

  @Expose()
  @IsArray()
  value: string;

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
  @IsBoolean()
  isAnswered?: boolean;

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
  value?: string | string[];

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
        value: '',
        isAnswered: false,
        sublist: [],
      },
      {
        questionKey: 'titleUnique',
        comment: null,
        isMultiple: false,
        options: [{ optionValue: 'yes' }, { optionValue: 'no' }],
        value: '',
        isAnswered: false,
        sublist: [],
      },
      {
        questionKey: 'realisticDuration',
        comment: null,
        isMultiple: false,
        options: [{ optionValue: 'yes' }, { optionValue: 'no' }],
        isAnswered: false,
        value: '',
        sublist: [],
      },
      {
        questionKey: 'analysisPlanClear',
        comment: null,
        isMultiple: false,
        options: [{ optionValue: 'yes' }, { optionValue: 'no' }],
        isAnswered: false,
        value: '',
        sublist: [],
      },
      {
        questionKey: 'exampleScriptsAttached',
        comment: null,
        isMultiple: false,
        options: [{ optionValue: 'yes' }, { optionValue: 'no' }],
        isAnswered: false,
        value: '',
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
        isAnswered: false,
        value: [],
        sublist: [],
      },
    ],
    projectProperties: [
      {
        questionKey: 'NonMII-Project',
        comment: null,
        isMultiple: false,
        options: [{ optionValue: 'yes' }],
        isAnswered: false,
        value: '',
      },
      {
        questionKey: 'NonGDNG-Project',
        comment: null,
        isMultiple: false,
        options: [{ optionValue: 'yes' }],
        isAnswered: false,
        value: '',
      },
      {
        questionKey: 'HealthData-Project',
        comment: null,
        isMultiple: false,
        options: [{ optionValue: 'yes' }],
        isAnswered: false,
        value: '',
      },
      {
        questionKey: 'Intl-Participants',
        comment: null,
        isMultiple: false,
        options: [{ optionValue: 'yes' }],
        isAnswered: false,
        value: '',
      },
      {
        questionKey: 'Commercial-Participants',
        comment: null,
        isMultiple: false,
        options: [{ optionValue: 'yes' }],
        isAnswered: false,
        value: '',
      },
      {
        questionKey: 'PartnerProject-Participants',
        comment: null,
        isMultiple: false,
        options: [{ optionValue: 'yes' }],
        isAnswered: false,
        value: '',
      },
      {
        questionKey: 'LogicalPartner-DIC',
        comment: null,
        isMultiple: false,
        options: [{ optionValue: 'yes' }],
        isAnswered: false,
        value: '',
      },
      {
        questionKey: 'Researcher-Support',
        comment: null,
        isMultiple: false,
        options: [{ optionValue: 'yes' }],
        isAnswered: false,
        value: '',
      },
      {
        questionKey: 'DataIntegration',
        comment: null,
        isMultiple: false,
        options: [{ optionValue: 'yes' }],
        isAnswered: false,
        value: '',
      },
      {
        questionKey: 'Biosamples-Requested',
        comment: null,
        isMultiple: false,
        options: [{ optionValue: 'yes' }],
        isAnswered: false,
        value: '',
      },
      {
        questionKey: 'External-Lab',
        comment: null,
        isMultiple: false,
        options: [{ optionValue: 'yes' }],
        isAnswered: false,
        value: '',
      },
    ],
    ...dbChecklist,
  };
};
