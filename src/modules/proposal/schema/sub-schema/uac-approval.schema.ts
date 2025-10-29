import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Location } from 'src/modules/location/schema/location.schema';

export type UacApprovalDocument = UacApproval & Document;

@Schema({ _id: true })
export class UacApproval {
  @Prop({ type: String, ref: () => Location })
  location: string;

  @Prop()
  dataAmount: number;

  @Prop({ type: Boolean, default: false })
  isContractSigned: boolean;

  _id: string;

  @Prop({ type: Date, default: Date.now, immutable: true })
  createdAt: Date;

  @Prop({ type: Date })
  signedAt: Date;

  // Could be also the system
  @Prop()
  signedByOwnerId: string;

  @Prop({ type: Boolean })
  isLate?: boolean;
}

const UacApprovalSchema = SchemaFactory.createForClass(UacApproval);

export { UacApprovalSchema };
