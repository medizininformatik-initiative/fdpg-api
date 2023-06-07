import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ScheduleType } from 'src/modules/scheduler/enums/schedule-type.enum';

export type ScheduledEventDocument = ScheduledEvent & Document;

@Schema({ _id: false })
export class ScheduledEvent {
  @Prop({
    type: String,
    enum: ScheduleType,
  })
  type: ScheduleType;

  @Prop()
  scheduleId: string;
}

export const ScheduledEventSchema = SchemaFactory.createForClass(ScheduledEvent);
