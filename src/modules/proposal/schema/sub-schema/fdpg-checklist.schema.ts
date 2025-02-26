import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type FdpgChecklistDocument = FdpgChecklist & Document;

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
        value: { type: [String], required: true },
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
            value: { type: [String], required: true },
          },
        ],
      },
    ],
    default: function () {
      return [
        {
          questionKey: 'DICpreCheck',
          comment: null,
          isMultiple: false,
          options: [{ optionValue: 'yes' }, { optionValue: 'no' }],
          isAnswered: false,
          value: '',
          sublist: [],
        },
        {
          questionKey: 'titleUnique',
          comment: null,
          isMultiple: false,
          options: [{ optionValue: 'yes' }, { optionValue: 'no' }],
          isAnswered: false,
          value: '',
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
        {
          questionKey: 'testLocations',
          comment: null,
          isMultiple: false,
          options: [],
          isAnswered: false,
          value: '',

          sublist: [],
        },
        {
          questionKey: 'cohortcommentClear',
          comment: null,
          isMultiple: false,
          options: [{ optionValue: 'yes' }, { optionValue: 'no' }],
          isAnswered: false,
          value: '',

          sublist: [],
        },
        {
          questionKey: 'technicalDataSelection',
          comment: null,
          isMultiple: false,
          options: [{ optionValue: 'yes' }, { optionValue: 'no' }],
          isAnswered: false,
          value: '',

          sublist: [],
        },
        {
          questionKey: 'uacDataSelectionComprehensible',
          comment: null,
          isMultiple: false,
          options: [{ optionValue: 'yes' }, { optionValue: 'no' }],
          isAnswered: false,
          value: '',

          sublist: [],
        },
        {
          questionKey: 'basicPopulationDefinition',
          comment: null,
          isMultiple: false,
          options: [{ optionValue: 'yes' }, { optionValue: 'no' }],
          isAnswered: false,
          value: '',

          sublist: [],
        },
        {
          questionKey: 'scientificQuestionDifferentiation',
          comment: null,
          isMultiple: false,
          options: [{ optionValue: 'yes' }, { optionValue: 'no' }],
          isAnswered: false,
          value: '',

          sublist: [],
        },
        {
          questionKey: 'ethicsVote',
          comment: null,
          isMultiple: false,
          options: [{ optionValue: 'yes' }, { optionValue: 'no' }],
          isAnswered: false,
          value: '',

          sublist: [],
        },
        {
          questionKey: 'extraStudyProtocol',
          comment: null,
          isMultiple: false,
          options: [{ optionValue: 'yes' }, { optionValue: 'no' }],
          isAnswered: false,
          value: '',

          sublist: [
            {
              questionKey: 'ethicsVoteAssignment',
              comment: null,
              isMultiple: false,
              options: [{ optionValue: 'yes' }, { optionValue: 'no' }],
              isAnswered: false,
              value: '',
            },
            {
              questionKey: 'analysisTypeCorrect',
              comment: null,
              isMultiple: false,
              options: [{ optionValue: 'yes' }, { optionValue: 'no' }],
              isAnswered: false,
              value: '',
            },
            {
              questionKey: 'dataSelectionConsistency',
              comment: null,
              isMultiple: false,
              options: [{ optionValue: 'yes' }, { optionValue: 'no' }],
              isAnswered: false,
              value: '',
            },
            {
              questionKey: 'analysisPlanConsistency',
              comment: null,
              isMultiple: false,
              options: [{ optionValue: 'yes' }, { optionValue: 'no' }],
              isAnswered: false,
              value: '',
            },
            {
              questionKey: 'projectTitle',
              comment: null,
              isMultiple: false,
              options: [{ optionValue: 'yes' }, { optionValue: 'no' }],
              isAnswered: false,
              value: '',
            },
            {
              questionKey: 'miiStudyExplanation',
              comment: null,
              isMultiple: false,
              options: [{ optionValue: 'yes' }, { optionValue: 'no' }],
              isAnswered: false,
              value: '',
            },
          ],
        },
        {
          questionKey: 'requestedLogicalDMST',
          comment: null,
          isMultiple: false,
          options: [{ optionValue: 'yes' }, { optionValue: 'no' }],
          isAnswered: false,
          value: '',

          sublist: [],
        },
        {
          questionKey: 'sufficientCoarseningAggregation',
          comment: null,
          isMultiple: false,
          options: [{ optionValue: 'yes' }, { optionValue: 'no' }],
          isAnswered: false,
          value: '',

          sublist: [],
        },
        {
          questionKey: 'dataPrivacyConceptAttached',
          comment: null,
          isMultiple: false,
          options: [{ optionValue: 'yes' }, { optionValue: 'no' }],
          isAnswered: false,
          value: '',

          sublist: [],
        },
      ];
    },
  })
  checkListVerification: Array<{
    _id: Types.ObjectId;
    questionKey: string;
    comment: string | null;
    isMultiple: boolean;
    options: { optionValue: string }[];
    value: string;
    isAnswered: boolean;
    sublist: {
      _id: Types.ObjectId;
      questionKey: string;
      comment: string | null;
      isMultiple: boolean;
      options: { optionValue: string }[];
      value: string;
    }[];
  }>;

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
      },
    ],
    default: function () {
      return [
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
      ];
    },
  })
  projectProperties: Array<{
    _id: Types.ObjectId;
    questionKey: string;
    comment: string | null;
    isMultiple: boolean;
    options: { optionValue: string }[];
    value: string;
    isAnswered: boolean;
  }>;
}

export const FdpgChecklistSchema = SchemaFactory.createForClass(FdpgChecklist);
