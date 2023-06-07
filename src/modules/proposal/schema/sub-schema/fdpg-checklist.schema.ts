import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type FdpgChecklistDocument = FdpgChecklist & Document;

@Schema({ _id: false })
export class FdpgChecklist {
  @Prop({
    type: Boolean,
    default: false,
  })
  isRegistrationLinkSent: boolean;

  @Prop({
    type: Boolean,
    default: false,
  })
  isUnique: boolean;

  @Prop({
    type: Boolean,
    default: false,
  })
  isAttachmentsChecked: boolean;

  @Prop({
    type: Boolean,
    default: false,
  })
  isChecked: boolean;
}

export const FdpgChecklistSchema = SchemaFactory.createForClass(FdpgChecklist);
