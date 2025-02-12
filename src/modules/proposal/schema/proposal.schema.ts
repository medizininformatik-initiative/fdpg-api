import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { MiiLocation } from 'src/shared/constants/mii-locations';
import { Owner, OwnerSchema } from 'src/shared/schema/owner.schema';
import { Version, VersionSchema } from 'src/shared/schema/version.schema';
import { ProposalStatus } from '../enums/proposal-status.enum';
import { ConditionalApproval } from './sub-schema/conditional-approval.schema';
import { DeclineReason, DeclineReasonSchema } from './sub-schema/decline-reason.schema';
import { FdpgChecklist, FdpgChecklistSchema } from './sub-schema/fdpg-checklist.schema';
import { FdpgTask } from './sub-schema/fdpg-task.schema';
import { HistoryEvent, HistoryEventSchema } from './sub-schema/history-event.schema';
import { Participant, ParticipantSchema } from './sub-schema/participant.schema';
import { Publication, PublicationSchema } from './sub-schema/publication.schema';
import { ReportSchema, Report } from './sub-schema/report.schema';
import { RequestedData, RequestedDataSchema } from './sub-schema/requested-data.schema';
import { ScheduledEvent } from './sub-schema/scheduled-event.schema';
import { UacApproval } from './sub-schema/uac-approval.schema';
import { Upload, UploadSchema } from './sub-schema/upload.schema';
import { UserProject, UserProjectSchema } from './sub-schema/user-project.schema';
import { Applicant, ApplicantSchema } from './sub-schema/applicant.schema';
import { ProjectResponsible, ProjectResponsibleSchema } from './sub-schema/project-responsible.schema';
import { ProjectUser, ProjectUserSchema } from './sub-schema/project-user.schema';
import { PlatformIdentifier } from 'src/modules/admin/enums/platform-identifier.enum';
import {
  AdditionalLocationInformation,
  AdditionalLocationInformationSchema,
} from './sub-schema/additional-location-information.schema';

export type ProposalDocument = Proposal & Document;

@Schema()
export class Proposal {
  @Prop({
    unique: true,
  })
  projectAbbreviation: string;

  @Prop({
    type: String,
    enum: PlatformIdentifier,
    default: PlatformIdentifier.Mii,
  })
  platform: PlatformIdentifier;

  @Prop([ParticipantSchema])
  participants: Participant[];

  @Prop({ type: ApplicantSchema })
  applicant: Applicant;

  @Prop({ type: ProjectResponsibleSchema })
  projectResponsible: ProjectResponsible;

  @Prop({ type: ProjectUserSchema })
  projectUser: ProjectUser;

  @Prop({ type: UserProjectSchema })
  userProject: UserProject;

  @Prop({ type: RequestedDataSchema })
  requestedData: RequestedData;

  @Prop({ type: FdpgChecklistSchema })
  fdpgChecklist: FdpgChecklist;

  @Prop({
    type: String,
    enum: ProposalStatus,
  })
  status: ProposalStatus;

  @Prop({
    type: Boolean,
    default: false,
  })
  isLocked: boolean;

  @Prop({ type: OwnerSchema })
  owner: Owner;

  @Prop({ type: VersionSchema })
  version: Version;

  @Prop({
    type: String,
    immutable: true,
  })
  ownerId: string;

  @Prop()
  ownerName: string;

  @Prop({ type: [HistoryEventSchema], default: [] })
  history: HistoryEvent[];

  @Prop({ type: [UploadSchema], default: [] })
  uploads: Upload[];

  @Prop({ type: [PublicationSchema], default: [] })
  publications: Publication[];

  @Prop({ type: [AdditionalLocationInformationSchema], default: [] })
  additionalLocationInformation: AdditionalLocationInformation[];

  @Prop({ type: [ReportSchema], default: [] })
  reports: Report[];

  @Prop({
    type: Date,
    default: Date.now,
    immutable: true,
  })
  createdAt: Date;

  @Prop({
    type: Date,
    default: Date.now,
  })
  updatedAt: Date;

  @Prop({
    type: Date,
  })
  submittedAt: Date;

  @Prop({
    type: Date,
  })
  dueDateForStatus: Date;

  @Prop({
    type: Date,
  })
  statusChangeToLocationCheckAt: Date;

  @Prop({
    type: Date,
  })
  statusChangeToLocationContractingAt: Date;

  _id: string;

  // Task, Events & TODOs to query for
  @Prop()
  numberOfRequestedLocations: number;

  // UAC Approved locations after status change to CONTRACTING
  @Prop()
  numberOfApprovedLocations: number;

  // Signed contracts after status change to EXPECT_DATA_DELIVERY
  @Prop()
  numberOfSignedLocations: number;

  // FDPG Tasks --->
  // Count should match the count of task details array
  @Prop({
    type: Number,
    default: 0,
  })
  openFdpgTasksCount: number;

  @Prop()
  openFdpgTasks: FdpgTask[];
  // FDPG Tasks <----

  // LOCATION Tasks --->
  // The following arrays should be used as a flow.
  // One location should only be in one state at the same time

  @Prop([String])
  openDizChecks: MiiLocation[];

  @Prop([String])
  dizApprovedLocations: MiiLocation[];

  @Prop([String])
  openDizConditionChecks: MiiLocation[];

  @Prop([String])
  uacApprovedLocations: MiiLocation[];

  @Prop([String])
  requestedButExcludedLocations: MiiLocation[];

  @Prop([String])
  signedContracts: MiiLocation[];
  // LOCATION Tasks <----

  // Conditional and UAC approval are stored additionally to the "flow-arrays" and are persistent
  @Prop([ConditionalApproval])
  locationConditionDraft: ConditionalApproval[];

  @Prop([ConditionalApproval])
  conditionalApprovals: ConditionalApproval[];

  @Prop([UacApproval])
  uacApprovals: UacApproval[];

  // Reasons for Location to not participate
  @Prop({ type: [DeclineReasonSchema], default: [] })
  declineReasons: DeclineReason[];

  @Prop({
    type: Number,
    default: 0,
  })
  totalPromisedDataAmount: number;

  @Prop({
    type: Number,
    default: 0,
  })
  totalContractedDataAmount: number;

  @Prop({
    type: Boolean,
    default: false,
  })
  contractAcceptedByResearcher: boolean;

  @Prop({
    type: Boolean,
    default: false,
  })
  contractRejectedByResearcher: boolean;

  @Prop()
  contractRejectedByResearcherReason: string;

  @Prop({
    type: Boolean,
    default: false,
  })
  isContractingComplete: boolean;

  @Prop({
    type: Date,
  })
  researcherSignedAt: Date;

  @Prop([ScheduledEvent])
  scheduledEvents: ScheduledEvent[];

  @Prop({
    type: Number,
    default: 0,
  })
  migrationVersion?: number;

  @Prop()
  migrationError?: string;

  @Prop()
  fdpgCheckNotes?: string;
}

const ProposalSchema = SchemaFactory.createForClass(Proposal);

ProposalSchema.pre<Proposal>('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// Indexes for get by user and sort by key. Will be used by Researcher
ProposalSchema.index({ ownerId: 1, status: 1, _id: 1 });
ProposalSchema.index({ ownerId: 1, status: 1, submittedAt: 1 });
ProposalSchema.index({ ownerId: 1, status: 1, dueDateForStatus: 1 });
ProposalSchema.index({ ownerId: 1, status: 1, projectAbbreviation: 1 });

// Participating Scientists
ProposalSchema.index({ 'participants.researcher.email': 1, status: 1 });

// Indexes for get by status and sort by key
ProposalSchema.index({ status: 1, _id: 1 });
ProposalSchema.index({ status: 1, submittedAt: 1 });
ProposalSchema.index({ status: 1, dueDateForStatus: 1 });
ProposalSchema.index({ status: 1, projectAbbreviation: 1 });
ProposalSchema.index({ status: 1, ownerName: 1 });

// FDPG Member with tasks check
ProposalSchema.index({ status: 1, openFdpgTasksCount: 1, _id: 1 });
ProposalSchema.index({ status: 1, openFdpgTasksCount: 1, submittedAt: 1 });
ProposalSchema.index({ status: 1, openFdpgTasksCount: 1, dueDateForStatus: 1 });
ProposalSchema.index({ status: 1, openFdpgTasksCount: 1, projectAbbreviation: 1 });
ProposalSchema.index({ status: 1, openFdpgTasksCount: 1, ownerName: 1 });

// Location Member
ProposalSchema.index({ status: 1, openDizChecks: 1, _id: 1 });
ProposalSchema.index({ status: 1, openDizChecks: 1, submittedAt: 1 });
ProposalSchema.index({ status: 1, openDizChecks: 1, dueDateForStatus: 1 });
ProposalSchema.index({ status: 1, openDizChecks: 1, projectAbbreviation: 1 });
ProposalSchema.index({ status: 1, openDizChecks: 1, ownerName: 1 });

ProposalSchema.index({ status: 1, dizApprovedLocations: 1, _id: 1 });
ProposalSchema.index({ status: 1, dizApprovedLocations: 1, submittedAt: 1 });
ProposalSchema.index({ status: 1, dizApprovedLocations: 1, dueDateForStatus: 1 });
ProposalSchema.index({ status: 1, dizApprovedLocations: 1, projectAbbreviation: 1 });
ProposalSchema.index({ status: 1, dizApprovedLocations: 1, ownerName: 1 });

ProposalSchema.index({ status: 1, uacApprovedLocations: 1, _id: 1 });
ProposalSchema.index({ status: 1, uacApprovedLocations: 1, submittedAt: 1 });
ProposalSchema.index({ status: 1, uacApprovedLocations: 1, dueDateForStatus: 1 });
ProposalSchema.index({ status: 1, uacApprovedLocations: 1, projectAbbreviation: 1 });
ProposalSchema.index({ status: 1, uacApprovedLocations: 1, ownerName: 1 });

ProposalSchema.index({ status: 1, signedContracts: 1, _id: 1 });
ProposalSchema.index({ status: 1, signedContracts: 1, submittedAt: 1 });
ProposalSchema.index({ status: 1, signedContracts: 1, dueDateForStatus: 1 });
ProposalSchema.index({ status: 1, signedContracts: 1, projectAbbreviation: 1 });
ProposalSchema.index({ status: 1, signedContracts: 1, ownerName: 1 });

ProposalSchema.index({ status: 1, requestedButExcludedLocations: 1, _id: 1 });
ProposalSchema.index({ status: 1, requestedButExcludedLocations: 1, submittedAt: 1 });
ProposalSchema.index({ status: 1, requestedButExcludedLocations: 1, dueDateForStatus: 1 });
ProposalSchema.index({ status: 1, requestedButExcludedLocations: 1, projectAbbreviation: 1 });
ProposalSchema.index({ status: 1, requestedButExcludedLocations: 1, ownerName: 1 });

export { ProposalSchema };
