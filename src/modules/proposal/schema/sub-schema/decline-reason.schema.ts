import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Owner, OwnerSchema } from 'src/shared/schema/owner.schema';
import { DeclineType } from '../../enums/decline-type.enum';
import { Location } from 'src/modules/location/schema/location.schema';

export type DeclineReasonDocument = DeclineReason & Document;

@Schema({ _id: false })
export class DeclineReason {
  @Prop(String)
  type: DeclineType;

  @Prop()
  reason?: string;

  @Prop({ type: String, ref: () => Location })
  location: string;

  @Prop({ type: OwnerSchema })
  owner?: Owner;

  @Prop({ type: Date, default: Date.now, immutable: true })
  createdAt: Date;

  @Prop({ type: Boolean })
  isLate?: boolean;
}

const DeclineReasonSchema = SchemaFactory.createForClass(DeclineReason);

export { DeclineReasonSchema };
