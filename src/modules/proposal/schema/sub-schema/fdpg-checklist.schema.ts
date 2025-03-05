import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type FdpgChecklistDocument = FdpgChecklist & Document;

interface ChecklistOption {
  optionValue: string;
  isSelected?: boolean;
}

interface ChecklistItem {
  _id: Types.ObjectId;
  questionKey: string;
  comment: string | null;
  isMultiple: boolean;
  options: ChecklistOption[];
  answer: string[];
  sublist: ChecklistItem[];
  isAnswered: boolean;
}

const DEFAULT_CHECKLIST_ITEMS: ChecklistItem[] = [
  {
    _id: new Types.ObjectId(),
    questionKey: 'DICpreCheck',
    comment: null,
    isMultiple: false,
    options: [{ optionValue: 'yes' }, { optionValue: 'no' }],
    isAnswered: false,
    answer: [],
    sublist: [],
  },
  {
    _id: new Types.ObjectId(),
    questionKey: 'titleUnique',
    comment: null,
    isMultiple: false,
    options: [{ optionValue: 'yes' }, { optionValue: 'no' }],
    isAnswered: false,
    answer: [],
    sublist: [],
  },
  {
    _id: new Types.ObjectId(),
    questionKey: 'realisticDuration',
    comment: null,
    isMultiple: false,
    options: [{ optionValue: 'yes' }, { optionValue: 'no' }],
    isAnswered: false,
    answer: [],
    sublist: [],
  },
  {
    _id: new Types.ObjectId(),
    questionKey: 'analysisPlanClear',
    comment: null,
    isMultiple: false,
    options: [{ optionValue: 'yes' }, { optionValue: 'no' }],
    isAnswered: false,
    answer: [],
    sublist: [],
  },
  {
    _id: new Types.ObjectId(),
    questionKey: 'exampleScriptsAttached',
    comment: null,
    isMultiple: false,
    options: [{ optionValue: 'yes' }, { optionValue: 'no' }],
    isAnswered: false,
    answer: [],
    sublist: [],
  },
  {
    _id: new Types.ObjectId(),
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
    _id: new Types.ObjectId(),
    questionKey: 'testLocations',
    comment: null,
    isMultiple: false,
    options: [],
    isAnswered: false,
    answer: [],
    sublist: [],
  },
  {
    _id: new Types.ObjectId(),
    questionKey: 'cohortcommentClear',
    comment: null,
    isMultiple: false,
    options: [{ optionValue: 'yes' }, { optionValue: 'no' }],
    isAnswered: false,
    answer: [],
    sublist: [],
  },
  {
    _id: new Types.ObjectId(),
    questionKey: 'technicalDataSelection',
    comment: null,
    isMultiple: false,
    options: [{ optionValue: 'yes' }, { optionValue: 'no' }],
    isAnswered: false,
    answer: [],
    sublist: [],
  },
  {
    _id: new Types.ObjectId(),
    questionKey: 'uacDataSelectionComprehensible',
    comment: null,
    isMultiple: false,
    options: [{ optionValue: 'yes' }, { optionValue: 'no' }],
    isAnswered: false,
    answer: [],
    sublist: [],
  },
  {
    _id: new Types.ObjectId(),
    questionKey: 'basicPopulationDefinition',
    comment: null,
    isMultiple: false,
    options: [{ optionValue: 'yes' }, { optionValue: 'no' }],
    isAnswered: false,
    answer: [],
    sublist: [],
  },
  {
    _id: new Types.ObjectId(),
    questionKey: 'scientificQuestionDifferentiation',
    comment: null,
    isMultiple: false,
    options: [{ optionValue: 'yes' }, { optionValue: 'no' }],
    isAnswered: false,
    answer: [],
    sublist: [],
  },
  {
    _id: new Types.ObjectId(),
    questionKey: 'ethicsVote',
    comment: null,
    isMultiple: false,
    options: [{ optionValue: 'yes' }, { optionValue: 'no' }],
    isAnswered: false,
    answer: [],
    sublist: [],
  },
  {
    _id: new Types.ObjectId(),
    questionKey: 'extraStudyProtocol',
    comment: null,
    isMultiple: false,
    options: [{ optionValue: 'yes' }, { optionValue: 'no' }],
    isAnswered: false,
    answer: [],
    sublist: [
      {
        _id: new Types.ObjectId(),
        questionKey: 'ethicsVoteAssignment',
        comment: null,
        isMultiple: false,
        options: [{ optionValue: 'yes' }, { optionValue: 'no' }],
        answer: [],
        sublist: [],
        isAnswered: false,
      },
      {
        _id: new Types.ObjectId(),
        questionKey: 'analysisTypeCorrect',
        comment: null,
        isMultiple: false,
        options: [{ optionValue: 'yes' }, { optionValue: 'no' }],
        answer: [],
        sublist: [],
        isAnswered: false,
      },
      {
        _id: new Types.ObjectId(),
        questionKey: 'dataSelectionConsistency',
        comment: null,
        isMultiple: false,
        options: [{ optionValue: 'yes' }, { optionValue: 'no' }],
        answer: [],
        sublist: [],
        isAnswered: false,
      },
      {
        _id: new Types.ObjectId(),
        questionKey: 'analysisPlanConsistency',
        comment: null,
        isMultiple: false,
        options: [{ optionValue: 'yes' }, { optionValue: 'no' }],
        answer: [],
        sublist: [],
        isAnswered: false,
      },
      {
        _id: new Types.ObjectId(),
        questionKey: 'projectTitle',
        comment: null,
        isMultiple: false,
        options: [{ optionValue: 'yes' }, { optionValue: 'no' }],
        answer: [],
        sublist: [],
        isAnswered: false,
      },
      {
        _id: new Types.ObjectId(),
        questionKey: 'miiStudyExplanation',
        comment: null,
        isMultiple: false,
        options: [{ optionValue: 'yes' }, { optionValue: 'no' }],
        answer: [],
        sublist: [],
        isAnswered: false,
      },
    ],
  },
  {
    _id: new Types.ObjectId(),
    questionKey: 'requestedLogicalDMST',
    comment: null,
    isMultiple: false,
    options: [{ optionValue: 'yes' }, { optionValue: 'no' }],
    isAnswered: false,
    answer: [],
    sublist: [],
  },
  {
    _id: new Types.ObjectId(),
    questionKey: 'sufficientCoarseningAggregation',
    comment: null,
    isMultiple: false,
    options: [{ optionValue: 'yes' }, { optionValue: 'no' }],
    isAnswered: false,
    answer: [],
    sublist: [],
  },
  {
    _id: new Types.ObjectId(),
    questionKey: 'dataPrivacyConceptAttached',
    comment: null,
    isMultiple: false,
    options: [{ optionValue: 'yes' }, { optionValue: 'no' }],
    isAnswered: false,
    answer: [],
    sublist: [],
  },
];

const DEFAULT_PROJECT_PROPERTIES: ChecklistItem[] = [
  {
    _id: new Types.ObjectId(),
    questionKey: 'NonMII-Project',
    comment: null,
    isMultiple: false,
    options: [{ optionValue: 'yes' }],
    isAnswered: false,
    answer: [],
    sublist: [],
  },
  {
    _id: new Types.ObjectId(),
    questionKey: 'NonGDNG-Project',
    comment: null,
    isMultiple: false,
    options: [{ optionValue: 'yes' }],
    isAnswered: false,
    answer: [],
    sublist: [],
  },
  {
    _id: new Types.ObjectId(),
    questionKey: 'HealthData-Project',
    comment: null,
    isMultiple: false,
    options: [{ optionValue: 'yes' }],
    isAnswered: false,
    answer: [],
    sublist: [],
  },
  {
    _id: new Types.ObjectId(),
    questionKey: 'Intl-Participants',
    comment: null,
    isMultiple: false,
    options: [{ optionValue: 'yes' }],
    isAnswered: false,
    answer: [],
    sublist: [
      {
        _id: new Types.ObjectId(),
        questionKey: 'out-EU',
        comment: null,
        options: [{ optionValue: 'yes' }],
        isAnswered: false,
        answer: [],
        isMultiple: false,
        sublist: [],
      },
    ],
  },
  {
    _id: new Types.ObjectId(),
    questionKey: 'Commercial-Participants',
    comment: null,
    isMultiple: false,
    options: [{ optionValue: 'yes' }],
    isAnswered: false,
    answer: [],
    sublist: [],
  },
  {
    _id: new Types.ObjectId(),
    questionKey: 'PartnerProject-Participants',
    comment: null,
    isMultiple: false,
    options: [{ optionValue: 'yes' }],
    isAnswered: false,
    answer: [],
    sublist: [],
  },
  {
    _id: new Types.ObjectId(),
    questionKey: 'LogicalPartner-DIC',
    comment: null,
    isMultiple: false,
    options: [{ optionValue: 'yes' }],
    isAnswered: false,
    answer: [],
    sublist: [],
  },
  {
    _id: new Types.ObjectId(),
    questionKey: 'Researcher-Support',
    comment: null,
    isMultiple: false,
    options: [{ optionValue: 'yes' }],
    isAnswered: false,
    answer: [],
    sublist: [],
  },
  {
    _id: new Types.ObjectId(),
    questionKey: 'DataIntegration',
    comment: null,
    isMultiple: false,
    options: [{ optionValue: 'yes' }],
    isAnswered: false,
    answer: [],
    sublist: [],
  },
  {
    _id: new Types.ObjectId(),
    questionKey: 'Biosamples-Requested',
    comment: null,
    isMultiple: false,
    options: [{ optionValue: 'yes' }],
    isAnswered: false,
    answer: [],
    sublist: [],
  },
  {
    _id: new Types.ObjectId(),
    questionKey: 'External-Lab',
    comment: null,
    isMultiple: false,
    options: [{ optionValue: 'yes' }],
    isAnswered: false,
    answer: [],
    sublist: [],
  },
];

@Schema({ _id: false })
export class FdpgChecklist {
  @Prop({ type: Boolean, default: false })
  isRegistrationLinkSent: boolean;

  @Prop({
    type: [
      {
        _id: { type: Types.ObjectId, auto: true },
        questionKey: { type: String, required: true },
        comment: { type: String, default: null },
        isMultiple: { type: Boolean, required: true },
        options: [
          {
            optionValue: { type: String, required: true },
          },
        ],
        answer: { type: [String], required: true },
        sublist: [
          {
            _id: { type: Types.ObjectId, auto: true },
            questionKey: { type: String, required: true },
            comment: { type: String, default: null },
            isMultiple: { type: Boolean, required: true },
            options: [
              {
                optionValue: { type: String, required: true },
              },
            ],
            answer: { type: [String], required: true },
          },
        ],
        isAnswered: { type: Boolean, default: false },
      },
    ],
    default: DEFAULT_CHECKLIST_ITEMS,
  })
  checkListVerification: ChecklistItem[];

  @Prop({ type: String, default: null })
  fdpgInternalCheckNotes: string;

  @Prop({
    type: [
      {
        _id: { type: Types.ObjectId, auto: true },
        questionKey: { type: String, required: true },
        comment: { type: String, default: null },
        isMultiple: { type: Boolean, required: true },
        options: [
          {
            optionValue: { type: String, required: true },
            isSelected: { type: Boolean, default: false },
          },
        ],
        isAnswered: { type: Boolean, default: false },
        sublist: [
          {
            _id: { type: Types.ObjectId, auto: true },
            questionKey: { type: String, required: true },
            comment: { type: String, default: null },
            isMultiple: { type: Boolean, required: true },
            options: [
              {
                optionValue: { type: String, required: true },
              },
            ],
            answer: { type: [String], required: true },
          },
        ],
        answer: { type: [String], required: true },
      },
    ],
    default: DEFAULT_PROJECT_PROPERTIES,
  })
  projectProperties: ChecklistItem[];
}

export const FdpgChecklistSchema = SchemaFactory.createForClass(FdpgChecklist);
