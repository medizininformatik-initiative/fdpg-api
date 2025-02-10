import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { MiiLocation } from 'src/shared/constants/mii-locations';

export type ConditionalApprovalDocument = ConditionalApproval & Document;

@Schema({ _id: true })
export class ConditionalApproval {
  @Prop(String)
  location: MiiLocation;

  @Prop({
    type: Boolean,
    default: false,
  })
  isAccepted: boolean;

  @Prop()
  isContractSigned: boolean;

  @Prop()
  dataAmount: number;

  @Prop()
  uploadId?: string;

  @Prop()
  conditionReasoning?: string;

  @Prop()
  fdpgTaskId?: string;

  _id: string;

  @Prop({
    type: Date,
    default: Date.now,
    immutable: true,
  })
  createdAt: Date;

  @Prop({
    type: Date,
  })
  reviewedAt: Date;

  // Could be also the system
  @Prop()
  reviewedByOwnerId: string;

  // Could be also the system
  @Prop()
  signedByOwnerId: string;

  @Prop({
    type: Date,
  })
  signedAt: Date;
}

export const ConditionalApprovalSchema = SchemaFactory.createForClass(ConditionalApproval);
