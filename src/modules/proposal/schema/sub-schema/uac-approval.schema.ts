import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { MiiLocation } from 'src/shared/constants/mii-locations';

export type UacApprovalDocument = UacApproval & Document;

@Schema({ _id: true })
export class UacApproval {
  @Prop(String)
  location: MiiLocation;

  @Prop()
  dataAmount: number;

  @Prop({
    type: Boolean,
    default: false,
  })
  isContractSigned: boolean;

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
  signedAt: Date;

  // Could be also the system
  @Prop()
  signedByOwnerId: string;

  @Prop({
    type: Boolean,
  })
  isLate?: boolean;
}

export const UacApprovalSchema = SchemaFactory.createForClass(UacApproval);
