import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Location } from 'src/modules/location/schema/location.schema';

export type ConditionalApprovalDocument = ConditionalApproval & Document;

@Schema({ _id: true })
export class ConditionalApproval {
  @Prop({ type: String, ref: () => Location })
  location: string;

  @Prop({ type: Boolean, default: false })
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

  @Prop({ type: Date, default: Date.now, immutable: true })
  createdAt: Date;

  @Prop({ type: Date })
  reviewedAt: Date;

  // Could be also the system
  @Prop()
  reviewedByOwnerId: string;

  // Could be also the system
  @Prop()
  signedByOwnerId: string;

  @Prop({ type: Date })
  signedAt: Date;

  @Prop({ type: Boolean })
  isLate?: boolean;
}

const ConditionalApprovalSchema = SchemaFactory.createForClass(ConditionalApproval);

export { ConditionalApprovalSchema };
