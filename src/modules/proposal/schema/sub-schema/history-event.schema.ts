import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { MiiLocation } from 'src/shared/constants/mii-locations';
import { Owner, OwnerSchema } from 'src/shared/schema/owner.schema';
import { Version, VersionSchema } from 'src/shared/schema/version.schema';
import { HistoryEventType } from '../../enums/history-event.enum';

export type HistoryEventDocument = HistoryEvent & Document;

@Schema({ _id: false })
export class HistoryEvent {
  @Prop(String)
  type: HistoryEventType;

  @Prop(String)
  location?: MiiLocation;

  @Prop({ type: OwnerSchema })
  owner?: Owner;

  @Prop({ type: VersionSchema })
  proposalVersion: Version;

  @Prop({
    type: Object,
    required: false,
  })
  data?: Record<string, string | number>;

  @Prop({
    type: Date,
    default: Date.now,
    immutable: true,
  })
  createdAt: Date;
}

export const HistoryEventSchema = SchemaFactory.createForClass(HistoryEvent);
