import { Types } from 'mongoose';
import {
  IChecklistItem,
  IChecklistOption,
  IChecklist,
  CHECKLIST_KEYS,
  CHECKLIST_OPTIONS,
} from '../dto/proposal/checklist.types';

export const createChecklistItem = (
  questionKey: string,
  options: IChecklistOption[],
  isMultiple = false,
): IChecklistItem => ({
  questionKey,
  comment: null,
  isMultiple,
  options,
  isAnswered: false,
  answer: [],
  sublist: [],
  _id: new Types.ObjectId(),
});

export const DEFAULT_CHECKLIST_ITEMS: IChecklistItem[] = [
  createChecklistItem(CHECKLIST_KEYS.DIC_PRE_CHECK, CHECKLIST_OPTIONS.YES_NO_TNZ),
  createChecklistItem(CHECKLIST_KEYS.TITLE_UNIQUE, CHECKLIST_OPTIONS.YES_NO_TNZ),
  createChecklistItem(CHECKLIST_KEYS.REALISTIC_DURATION, CHECKLIST_OPTIONS.YES_NO_TNZ),
  createChecklistItem(CHECKLIST_KEYS.ANALYSIS_PLAN_CLEAR, CHECKLIST_OPTIONS.YES_NO_TNZ),
  createChecklistItem(CHECKLIST_KEYS.EXAMPLE_SCRIPTS_ATTACHED, CHECKLIST_OPTIONS.YES_NO_TNZ),
  createChecklistItem(CHECKLIST_KEYS.DISTRIBUTED_ANALYSIS, CHECKLIST_OPTIONS.DISTRIBUTED_ANALYSIS, true),
  createChecklistItem(CHECKLIST_KEYS.TEST_LOCATIONS, CHECKLIST_OPTIONS.EMPTY),
  createChecklistItem(CHECKLIST_KEYS.COHORT_COMMENT_CLEAR, CHECKLIST_OPTIONS.YES_NO_TNZ),
  createChecklistItem(CHECKLIST_KEYS.TECHNICAL_DATA_SELECTION, CHECKLIST_OPTIONS.YES_NO_TNZ),
  createChecklistItem(CHECKLIST_KEYS.UAC_DATA_SELECTION, CHECKLIST_OPTIONS.YES_NO_TNZ),
  createChecklistItem(CHECKLIST_KEYS.BASIC_POPULATION_DEFINITION, CHECKLIST_OPTIONS.YES_NO_TNZ),
  createChecklistItem(CHECKLIST_KEYS.SCIENTIFIC_QUESTION, CHECKLIST_OPTIONS.YES_NO_TNZ),
  createChecklistItem(CHECKLIST_KEYS.ETHICS_VOTE, CHECKLIST_OPTIONS.YES_NO_TNZ),
  {
    ...createChecklistItem(CHECKLIST_KEYS.EXTRA_STUDY_PROTOCOL, CHECKLIST_OPTIONS.YES_NO_TNZ),
    sublist: [
      createChecklistItem('ethicsVoteAssignment', CHECKLIST_OPTIONS.YES_NO_TNZ),
      createChecklistItem('analysisTypeCorrect', CHECKLIST_OPTIONS.YES_NO_TNZ),
      createChecklistItem('dataSelectionConsistency', CHECKLIST_OPTIONS.YES_NO_TNZ),
      createChecklistItem('analysisPlanConsistency', CHECKLIST_OPTIONS.YES_NO_TNZ),
      createChecklistItem('projectTitle', CHECKLIST_OPTIONS.YES_NO_TNZ),
      createChecklistItem('miiStudyExplanation', CHECKLIST_OPTIONS.YES_NO_TNZ),
    ],
  },
  createChecklistItem(CHECKLIST_KEYS.REQUESTED_LOGICAL_DMST, CHECKLIST_OPTIONS.YES_NO_TNZ),
  createChecklistItem(CHECKLIST_KEYS.SUFFICIENT_COARSENING, CHECKLIST_OPTIONS.YES_NO_TNZ),
  createChecklistItem(CHECKLIST_KEYS.DATA_PRIVACY_CONCEPT, CHECKLIST_OPTIONS.YES_NO_TNZ),
];

export const DEFAULT_PROJECT_PROPERTIES: IChecklistItem[] = [
  createChecklistItem(CHECKLIST_KEYS.NON_MII_PROJECT, CHECKLIST_OPTIONS.YES_NO_TNZ),
  createChecklistItem(CHECKLIST_KEYS.NON_GDNG_PROJECT, CHECKLIST_OPTIONS.YES_NO_TNZ),
  createChecklistItem(CHECKLIST_KEYS.HEALTH_DATA_PROJECT, CHECKLIST_OPTIONS.YES_NO_TNZ),
  {
    ...createChecklistItem(CHECKLIST_KEYS.INTL_PARTICIPANTS, CHECKLIST_OPTIONS.YES_NO_TNZ),
    sublist: [createChecklistItem('out-EU', CHECKLIST_OPTIONS.YES_NO_TNZ)],
  },
  createChecklistItem(CHECKLIST_KEYS.COMMERCIAL_PARTICIPANTS, CHECKLIST_OPTIONS.YES_NO_TNZ),
  createChecklistItem(CHECKLIST_KEYS.PARTNER_PROJECT_PARTICIPANTS, CHECKLIST_OPTIONS.YES_NO_TNZ),
  createChecklistItem(CHECKLIST_KEYS.LOGICAL_PARTNER_DIC, CHECKLIST_OPTIONS.YES_NO_TNZ),
  createChecklistItem(CHECKLIST_KEYS.RESEARCHER_SUPPORT, CHECKLIST_OPTIONS.YES_NO_TNZ),
  createChecklistItem(CHECKLIST_KEYS.DATA_INTEGRATION, CHECKLIST_OPTIONS.YES_NO_TNZ),
  createChecklistItem(CHECKLIST_KEYS.BIOSAMPLES_REQUESTED, CHECKLIST_OPTIONS.YES_NO_TNZ),
  createChecklistItem(CHECKLIST_KEYS.EXTERNAL_LAB, CHECKLIST_OPTIONS.YES_NO_TNZ),
];

export const initChecklist = (dbChecklist: Partial<IChecklist> = {}): IChecklist => ({
  isRegistrationLinkSent: false,
  fdpgInternalCheckNotes: null,
  checkListVerification: DEFAULT_CHECKLIST_ITEMS,
  projectProperties: DEFAULT_PROJECT_PROPERTIES,
  ...dbChecklist,
});
