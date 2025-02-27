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
      },
    ],
    default: function () {
      return [
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
        {
          questionKey: 'testLocations',
          comment: null,
          isMultiple: false,
          options: [],

          answer: [],

          sublist: [],
        },
        {
          questionKey: 'cohortcommentClear',
          comment: null,
          isMultiple: false,
          options: [{ optionValue: 'yes' }, { optionValue: 'no' }],

          answer: [],

          sublist: [],
        },
        {
          questionKey: 'technicalDataSelection',
          comment: null,
          isMultiple: false,
          options: [{ optionValue: 'yes' }, { optionValue: 'no' }],

          answer: [],

          sublist: [],
        },
        {
          questionKey: 'uacDataSelectionComprehensible',
          comment: null,
          isMultiple: false,
          options: [{ optionValue: 'yes' }, { optionValue: 'no' }],

          answer: [],

          sublist: [],
        },
        {
          questionKey: 'basicPopulationDefinition',
          comment: null,
          isMultiple: false,
          options: [{ optionValue: 'yes' }, { optionValue: 'no' }],

          answer: [],

          sublist: [],
        },
        {
          questionKey: 'scientificQuestionDifferentiation',
          comment: null,
          isMultiple: false,
          options: [{ optionValue: 'yes' }, { optionValue: 'no' }],

          answer: [],

          sublist: [],
        },
        {
          questionKey: 'ethicsVote',
          comment: null,
          isMultiple: false,
          options: [{ optionValue: 'yes' }, { optionValue: 'no' }],

          answer: [],

          sublist: [],
        },
        {
          questionKey: 'extraStudyProtocol',
          comment: null,
          isMultiple: false,
          options: [{ optionValue: 'yes' }, { optionValue: 'no' }],

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

          answer: [],

          sublist: [],
        },
        {
          questionKey: 'sufficientCoarseningAggregation',
          comment: null,
          isMultiple: false,
          options: [{ optionValue: 'yes' }, { optionValue: 'no' }],

          answer: [],

          sublist: [],
        },
        {
          questionKey: 'dataPrivacyConceptAttached',
          comment: null,
          isMultiple: false,
          options: [{ optionValue: 'yes' }, { optionValue: 'no' }],

          answer: [],

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
    answer: string;
    sublist: {
      _id: Types.ObjectId;
      questionKey: string;
      comment: string | null;
      isMultiple: boolean;
      options: { optionValue: string }[];
      answer: string;
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
      },
    ],
    default: function () {
      return [
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
      ];
    },
  })
  projectProperties: Array<{
    _id: Types.ObjectId;
    questionKey: string;
    comment: string | null;
    isMultiple: boolean;
    options: { optionValue: string }[];
    answer: string;
  }>;
}

export const FdpgChecklistSchema = SchemaFactory.createForClass(FdpgChecklist);
