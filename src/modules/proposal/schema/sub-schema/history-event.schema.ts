import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Owner, OwnerSchema } from 'src/shared/schema/owner.schema';
import { Version, VersionSchema } from 'src/shared/schema/version.schema';
import { HistoryEventType } from '../../enums/history-event.enum';
import { Location } from 'src/modules/location/schema/location.schema';

export type HistoryEventDocument = HistoryEvent & Document;

@Schema({ _id: false })
export class HistoryEvent {
  @Prop(String)
  type: HistoryEventType;

  @Prop({ type: String, ref: () => Location })
  location?: string;

  @Prop({ type: OwnerSchema })
  owner?: Owner;

  @Prop({ type: VersionSchema })
  proposalVersion: Version;

  @Prop({ type: Object, required: false })
  data?: Record<string, string | number>;

  @Prop({ type: Date, default: Date.now, immutable: true })
  createdAt: Date;
}

const HistoryEventSchema = SchemaFactory.createForClass(HistoryEvent);

export { HistoryEventSchema };
