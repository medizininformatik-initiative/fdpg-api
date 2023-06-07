import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { MiiLocation } from 'src/shared/constants/mii-locations';
import { Owner, OwnerSchema } from 'src/shared/schema/owner.schema';
import { DeclineType } from '../../enums/decline-type.enum';

export type DeclineReasonDocument = DeclineReason & Document;

@Schema({ _id: false })
export class DeclineReason {
  @Prop(String)
  type: DeclineType;

  @Prop()
  reason: string;

  @Prop(String)
  location: MiiLocation;

  @Prop({ type: OwnerSchema })
  owner?: Owner;

  @Prop({
    type: Date,
    default: Date.now,
    immutable: true,
  })
  createdAt: Date;
}

export const DeclineReasonSchema = SchemaFactory.createForClass(DeclineReason);
