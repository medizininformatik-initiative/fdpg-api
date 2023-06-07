import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ScheduleType } from '../enums/schedule-type.enum';

export type ScheduleDocument = Schedule & Document;

@Schema()
export class Schedule {
  @Prop({
    type: String,
    enum: ScheduleType,
  })
  type: ScheduleType;

  @Prop({
    type: Date,
    default: Date.now,
  })
  updatedAt: Date;

  @Prop({
    type: Date,
    default: Date.now,
    immutable: true,
  })
  createdAt: Date;

  @Prop({
    type: Date,
  })
  dueAfter: Date;

  @Prop({
    type: Date,
    default: new Date(0),
  })
  lockedUntil: Date;

  @Prop()
  numberOfTries: number;

  @Prop()
  referenceDocumentId: string;

  _id: string;
}

const ScheduleSchema = SchemaFactory.createForClass(Schedule);

ScheduleSchema.index({ referenceDocumentId: 1, dueDate: 1, lockedUntil: 1 });
ScheduleSchema.index({ dueAfter: 1, lockedUntil: 1, numberOfTries: 1 });

export { ScheduleSchema };
