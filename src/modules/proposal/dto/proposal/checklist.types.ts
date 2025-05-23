import { Types } from 'mongoose';

export interface IChecklistOption {
  optionValue: string;
}

export interface IChecklistItem {
  _id: Types.ObjectId;
  questionKey: string;
  comment: string | null;
  isMultiple: boolean;
  options: IChecklistOption[];
  answer: string[];
  sublist?: IChecklistItem[];
  isAnswered: boolean;
}

export interface IChecklist {
  isRegistrationLinkSent: boolean;
  fdpgInternalCheckNotes: string | null;
  checkListVerification: IChecklistItem[];
  projectProperties: IChecklistItem[];
}

export const CHECKLIST_OPTIONS = {
  YES_NO_TNZ: [{ optionValue: 'yes' }, { optionValue: 'no' }, { optionValue: 'TNZ' }] as IChecklistOption[],
  YES_ONLY: [{ optionValue: 'yes' }] as IChecklistOption[],
  DISTRIBUTED_ANALYSIS: [
    { optionValue: 'distributedAnalysisDockerR' },
    { optionValue: 'distributedAnalysisDataSHIELD' },
    { optionValue: 'distributedAnalysisOther' },
  ] as IChecklistOption[],
  EMPTY: [] as IChecklistOption[],
};

export const CHECKLIST_KEYS = {
  DIC_PRE_CHECK: 'DICpreCheck',
  TITLE_UNIQUE: 'titleUnique',
  REALISTIC_DURATION: 'realisticDuration',
  ANALYSIS_PLAN_CLEAR: 'analysisPlanClear',
  EXAMPLE_SCRIPTS_ATTACHED: 'exampleScriptsAttached',
  DISTRIBUTED_ANALYSIS: 'distributedAnalysis',
  TEST_LOCATIONS: 'testLocations',
  COHORT_COMMENT_CLEAR: 'cohortcommentClear',
  TECHNICAL_DATA_SELECTION: 'technicalDataSelection',
  UAC_DATA_SELECTION: 'uacDataSelectionComprehensible',
  BASIC_POPULATION_DEFINITION: 'basicPopulationDefinition',
  SCIENTIFIC_QUESTION: 'scientificQuestionDifferentiation',
  ETHICS_VOTE: 'ethicsVote',
  EXTRA_STUDY_PROTOCOL: 'extraStudyProtocol',
  REQUESTED_LOGICAL_DMST: 'requestedLogicalDMST',
  SUFFICIENT_COARSENING: 'sufficientCoarseningAggregation',
  DATA_PRIVACY_CONCEPT: 'dataPrivacyConceptAttached',
  NON_MII_PROJECT: 'NonMII-Project',
  NON_GDNG_PROJECT: 'NonGDNG-Project',
  HEALTH_DATA_PROJECT: 'HealthData-Project',
  INTL_PARTICIPANTS: 'Intl-Participants',
  COMMERCIAL_PARTICIPANTS: 'Commercial-Participants',
  PARTNER_PROJECT_PARTICIPANTS: 'PartnerProject-Participants',
  LOGICAL_PARTNER_DIC: 'LogicalPartner-DIC',
  RESEARCHER_SUPPORT: 'Researcher-Support',
  DATA_INTEGRATION: 'DataIntegration',
  BIOSAMPLES_REQUESTED: 'Biosamples-Requested',
  EXTERNAL_LAB: 'External-Lab',
} as const;
