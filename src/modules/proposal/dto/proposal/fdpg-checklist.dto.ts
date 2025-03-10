import { Exclude, Expose, Transform, Type } from 'class-transformer';
import { IsArray, IsBoolean, IsDate, IsMongoId, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Types } from 'mongoose';
import {
  IChecklist,
  IChecklistItem,
  IChecklistOption,
  IInternalCheckNote,
  CHECKLIST_OPTIONS,
  CHECKLIST_KEYS,
} from './checklist.types';

class ChecklistOption implements IChecklistOption {
  @Expose()
  @IsString()
  optionValue: string;
}

class ChecklistItem implements IChecklistItem {
  @Expose()
  @IsMongoId()
  @IsOptional()
  _id?: Types.ObjectId;

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

class InternalCheckNote implements IInternalCheckNote {
  @Expose()
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  date?: Date;

  @Expose()
  @IsOptional()
  @IsString()
  user?: string;

  @Expose()
  @IsOptional()
  @IsString()
  note?: string;
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
  @ValidateNested()
  @Type(() => InternalCheckNote)
  fdpgInternalCheckNotes: InternalCheckNote | null;

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
  @ValidateNested()
  @Type(() => InternalCheckNote)
  fdpgInternalCheckNotes?: InternalCheckNote;

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
  @ValidateNested()
  @Type(() => InternalCheckNote)
  fdpgInternalCheckNotes: InternalCheckNote | null;

  @Expose()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistItem)
  projectProperties: ChecklistItem[];
}

const createChecklistItem = (questionKey: string, options: IChecklistOption[], isMultiple = false): ChecklistItem => ({
  questionKey,
  comment: null,
  isMultiple,
  options,
  isAnswered: false,
  answer: [],
  sublist: [],
});

export const initChecklist = (dbChecklist: Partial<IChecklist> = {}): IChecklist => {
  const checkListVerification: ChecklistItem[] = [
    createChecklistItem(CHECKLIST_KEYS.DIC_PRE_CHECK, CHECKLIST_OPTIONS.YES_NO),
    createChecklistItem(CHECKLIST_KEYS.TITLE_UNIQUE, CHECKLIST_OPTIONS.YES_NO),
    createChecklistItem(CHECKLIST_KEYS.REALISTIC_DURATION, CHECKLIST_OPTIONS.YES_NO),
    createChecklistItem(CHECKLIST_KEYS.ANALYSIS_PLAN_CLEAR, CHECKLIST_OPTIONS.YES_NO),
    createChecklistItem(CHECKLIST_KEYS.EXAMPLE_SCRIPTS_ATTACHED, CHECKLIST_OPTIONS.YES_NO),
    createChecklistItem(CHECKLIST_KEYS.DISTRIBUTED_ANALYSIS, CHECKLIST_OPTIONS.DISTRIBUTED_ANALYSIS, true),
    createChecklistItem(CHECKLIST_KEYS.TEST_LOCATIONS, CHECKLIST_OPTIONS.EMPTY),
    createChecklistItem(CHECKLIST_KEYS.COHORT_COMMENT_CLEAR, CHECKLIST_OPTIONS.YES_NO),
    createChecklistItem(CHECKLIST_KEYS.TECHNICAL_DATA_SELECTION, CHECKLIST_OPTIONS.YES_NO),
    createChecklistItem(CHECKLIST_KEYS.UAC_DATA_SELECTION, CHECKLIST_OPTIONS.YES_NO),
    createChecklistItem(CHECKLIST_KEYS.BASIC_POPULATION_DEFINITION, CHECKLIST_OPTIONS.YES_NO),
    createChecklistItem(CHECKLIST_KEYS.SCIENTIFIC_QUESTION, CHECKLIST_OPTIONS.YES_NO),
    createChecklistItem(CHECKLIST_KEYS.ETHICS_VOTE, CHECKLIST_OPTIONS.YES_NO),
    {
      ...createChecklistItem(CHECKLIST_KEYS.EXTRA_STUDY_PROTOCOL, CHECKLIST_OPTIONS.YES_NO),
      sublist: [
        createChecklistItem('ethicsVoteAssignment', CHECKLIST_OPTIONS.YES_NO),
        createChecklistItem('analysisTypeCorrect', CHECKLIST_OPTIONS.YES_NO),
        createChecklistItem('dataSelectionConsistency', CHECKLIST_OPTIONS.YES_NO),
        createChecklistItem('analysisPlanConsistency', CHECKLIST_OPTIONS.YES_NO),
        createChecklistItem('projectTitle', CHECKLIST_OPTIONS.YES_NO),
        createChecklistItem('miiStudyExplanation', CHECKLIST_OPTIONS.YES_NO),
      ],
    },
    createChecklistItem(CHECKLIST_KEYS.REQUESTED_LOGICAL_DMST, CHECKLIST_OPTIONS.YES_NO),
    createChecklistItem(CHECKLIST_KEYS.SUFFICIENT_COARSENING, CHECKLIST_OPTIONS.YES_NO),
    createChecklistItem(CHECKLIST_KEYS.DATA_PRIVACY_CONCEPT, CHECKLIST_OPTIONS.YES_NO),
  ];

  const projectProperties: ChecklistItem[] = [
    createChecklistItem(CHECKLIST_KEYS.NON_MII_PROJECT, CHECKLIST_OPTIONS.YES_ONLY),
    createChecklistItem(CHECKLIST_KEYS.NON_GDNG_PROJECT, CHECKLIST_OPTIONS.YES_ONLY),
    createChecklistItem(CHECKLIST_KEYS.HEALTH_DATA_PROJECT, CHECKLIST_OPTIONS.YES_ONLY),
    {
      ...createChecklistItem(CHECKLIST_KEYS.INTL_PARTICIPANTS, CHECKLIST_OPTIONS.YES_ONLY),
      sublist: [createChecklistItem('out-EU', CHECKLIST_OPTIONS.YES_ONLY)],
    },
    createChecklistItem(CHECKLIST_KEYS.COMMERCIAL_PARTICIPANTS, CHECKLIST_OPTIONS.YES_ONLY),
    createChecklistItem(CHECKLIST_KEYS.PARTNER_PROJECT_PARTICIPANTS, CHECKLIST_OPTIONS.YES_ONLY),
    createChecklistItem(CHECKLIST_KEYS.LOGICAL_PARTNER_DIC, CHECKLIST_OPTIONS.YES_ONLY),
    createChecklistItem(CHECKLIST_KEYS.RESEARCHER_SUPPORT, CHECKLIST_OPTIONS.YES_ONLY),
    createChecklistItem(CHECKLIST_KEYS.DATA_INTEGRATION, CHECKLIST_OPTIONS.YES_ONLY),
    createChecklistItem(CHECKLIST_KEYS.BIOSAMPLES_REQUESTED, CHECKLIST_OPTIONS.YES_ONLY),
    createChecklistItem(CHECKLIST_KEYS.EXTERNAL_LAB, CHECKLIST_OPTIONS.YES_ONLY),
  ];

  return {
    isRegistrationLinkSent: false,
    fdpgInternalCheckNotes: null,
    checkListVerification,
    projectProperties,
    ...dbChecklist,
  } as IChecklist;
};
