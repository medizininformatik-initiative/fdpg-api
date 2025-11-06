import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SyncStatus } from '../../enums/sync-status.enum';

@Schema({ _id: false })
export class RegisterInfo {
  @Prop({
    type: Boolean,
    default: false,
  })
  isInternalRegistration: boolean;

  @Prop({
    type: String,
    required: false,
  })
  originalProposalId?: string;

  @Prop({
    type: String,
    required: false,
  })
  projectUrl?: string;

  @Prop({
    type: Boolean,
    default: false,
  })
  legalBasis: boolean;

  @Prop({
    type: String,
    required: false,
  })
  projectCategory?: string;

  @Prop({
    type: [String],
    default: [],
  })
  diagnoses: string[];

  @Prop({
    type: [String],
    default: [],
  })
  procedures: string[];

  // Sync fields for ACPT-Plugin integration
  @Prop({
    type: String,
    enum: SyncStatus,
    default: SyncStatus.NotSynced,
  })
  syncStatus: SyncStatus;

  @Prop({
    type: Date,
    required: false,
  })
  lastSyncedAt?: Date;

  @Prop({
    type: String,
    required: false,
  })
  lastSyncError?: string;

  @Prop({
    type: Number,
    default: 0,
  })
  syncRetryCount: number;

  @Prop({
    type: String,
    required: false,
  })
  acptPluginId?: string;

  _id: string;

  @Prop({
    type: Boolean,
    default: false,
  })
  isDone: boolean;
}

export const RegisterInfoSchema = SchemaFactory.createForClass(RegisterInfo);
