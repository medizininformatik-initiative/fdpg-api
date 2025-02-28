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
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ChecklistItem)
  sublist: ChecklistItem[];

  @Expose()
  @IsOptional()
  @IsBoolean()
  isAnswered: boolean;
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
  @IsBoolean()
  isAnswered?: boolean;

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
        isAnswered: false,
        answer: [],
        sublist: [],
      },
      {
        questionKey: 'titleUnique',
        comment: null,
        isMultiple: false,
        options: [{ optionValue: 'yes' }, { optionValue: 'no' }],
        isAnswered: false,
        answer: [],
        sublist: [],
      },
      {
        questionKey: 'realisticDuration',
        comment: null,
        isMultiple: false,
        options: [{ optionValue: 'yes' }, { optionValue: 'no' }],
        isAnswered: false,
        answer: [],

        sublist: [],
      },
      {
        questionKey: 'analysisPlanClear',
        comment: null,
        isMultiple: false,
        options: [{ optionValue: 'yes' }, { optionValue: 'no' }],
        isAnswered: false,
        answer: [],

        sublist: [],
      },
      {
        questionKey: 'exampleScriptsAttached',
        comment: null,
        isMultiple: false,
        options: [{ optionValue: 'yes' }, { optionValue: 'no' }],
        isAnswered: false,
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
        isAnswered: false,
        answer: [],

        sublist: [],
      },
      {
        questionKey: 'testLocations',
        comment: null,
        isMultiple: false,
        options: [],
        isAnswered: false,
        answer: [],

        sublist: [],
      },
      {
        questionKey: 'cohortcommentClear',
        comment: null,
        isMultiple: false,
        options: [{ optionValue: 'yes' }, { optionValue: 'no' }],
        isAnswered: false,
        answer: [],

        sublist: [],
      },
      {
        questionKey: 'technicalDataSelection',
        comment: null,
        isMultiple: false,
        options: [{ optionValue: 'yes' }, { optionValue: 'no' }],
        isAnswered: false,
        answer: [],

        sublist: [],
      },
      {
        questionKey: 'uacDataSelectionComprehensible',
        comment: null,
        isMultiple: false,
        options: [{ optionValue: 'yes' }, { optionValue: 'no' }],
        isAnswered: false,
        answer: [],

        sublist: [],
      },
      {
        questionKey: 'basicPopulationDefinition',
        comment: null,
        isMultiple: false,
        options: [{ optionValue: 'yes' }, { optionValue: 'no' }],
        isAnswered: false,
        answer: [],

        sublist: [],
      },
      {
        questionKey: 'scientificQuestionDifferentiation',
        comment: null,
        isMultiple: false,
        options: [{ optionValue: 'yes' }, { optionValue: 'no' }],
        isAnswered: false,
        answer: [],

        sublist: [],
      },
      {
        questionKey: 'ethicsVote',
        comment: null,
        isMultiple: false,
        options: [{ optionValue: 'yes' }, { optionValue: 'no' }],
        isAnswered: false,
        answer: [],

        sublist: [],
      },
      {
        questionKey: 'extraStudyProtocol',
        comment: null,
        isMultiple: false,
        options: [{ optionValue: 'yes' }, { optionValue: 'no' }],
        isAnswered: false,
        answer: [],

        sublist: [
          {
            questionKey: 'ethicsVoteAssignment',
            comment: null,
            isMultiple: false,
            options: [{ optionValue: 'yes' }, { optionValue: 'no' }],

            answer: [],
          },
          {
            questionKey: 'analysisTypeCorrect',
            comment: null,
            isMultiple: false,
            options: [{ optionValue: 'yes' }, { optionValue: 'no' }],

            answer: [],
          },
          {
            questionKey: 'dataSelectionConsistency',
            comment: null,
            isMultiple: false,
            options: [{ optionValue: 'yes' }, { optionValue: 'no' }],

            answer: [],
          },
          {
            questionKey: 'analysisPlanConsistency',
            comment: null,
            isMultiple: false,
            options: [{ optionValue: 'yes' }, { optionValue: 'no' }],

            answer: [],
          },
          {
            questionKey: 'projectTitle',
            comment: null,
            isMultiple: false,
            options: [{ optionValue: 'yes' }, { optionValue: 'no' }],

            answer: [],
          },
          {
            questionKey: 'miiStudyExplanation',
            comment: null,
            isMultiple: false,
            options: [{ optionValue: 'yes' }, { optionValue: 'no' }],

            answer: [],
          },
        ],
      },
      {
        questionKey: 'requestedLogicalDMST',
        comment: null,
        isMultiple: false,
        options: [{ optionValue: 'yes' }, { optionValue: 'no' }],
        isAnswered: false,
        answer: [],

        sublist: [],
      },
      {
        questionKey: 'sufficientCoarseningAggregation',
        comment: null,
        isMultiple: false,
        options: [{ optionValue: 'yes' }, { optionValue: 'no' }],
        isAnswered: false,
        answer: [],

        sublist: [],
      },
      {
        questionKey: 'dataPrivacyConceptAttached',
        comment: null,
        isMultiple: false,
        options: [{ optionValue: 'yes' }, { optionValue: 'no' }],
        isAnswered: false,
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
        isAnswered: false,
        answer: [],
      },
      {
        questionKey: 'NonGDNG-Project',
        comment: null,
        isMultiple: false,
        options: [{ optionValue: 'yes' }],
        isAnswered: false,
        answer: [],
      },
      {
        questionKey: 'HealthData-Project',
        comment: null,
        isMultiple: false,
        options: [{ optionValue: 'yes' }],
        isAnswered: false,
        answer: [],
      },
      {
        questionKey: 'Intl-Participants',
        comment: null,
        isMultiple: false,
        options: [{ optionValue: 'yes' }],
        isAnswered: false,
        answer: [],
      },
      {
        questionKey: 'Commercial-Participants',
        comment: null,
        isMultiple: false,
        options: [{ optionValue: 'yes' }],
        isAnswered: false,
        answer: [],
      },
      {
        questionKey: 'PartnerProject-Participants',
        comment: null,
        isMultiple: false,
        options: [{ optionValue: 'yes' }],
        isAnswered: false,
        answer: [],
      },
      {
        questionKey: 'LogicalPartner-DIC',
        comment: null,
        isMultiple: false,
        options: [{ optionValue: 'yes' }],
        isAnswered: false,
        answer: [],
      },
      {
        questionKey: 'Researcher-Support',
        comment: null,
        isMultiple: false,
        options: [{ optionValue: 'yes' }],
        isAnswered: false,
        answer: [],
      },
      {
        questionKey: 'DataIntegration',
        comment: null,
        isMultiple: false,
        options: [{ optionValue: 'yes' }],
        isAnswered: false,
        answer: [],
      },
      {
        questionKey: 'Biosamples-Requested',
        comment: null,
        isMultiple: false,
        options: [{ optionValue: 'yes' }],
        isAnswered: false,
        answer: [],
      },
      {
        questionKey: 'External-Lab',
        comment: null,
        isMultiple: false,
        options: [{ optionValue: 'yes' }],
        isAnswered: false,
        answer: [],
      },
    ],
    ...dbChecklist,
  };
};
