import { Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type FeasibilityDocument = Feasibility & Document;

@Schema({ _id: true })
export class Feasibility {
  @Prop()
  id: number;

  _id: string;

  @Prop()
  details: string;

  @Prop({
    type: Boolean,
    default: false,
  })
  isDone: boolean;
}

export const FeasibilitySchema = SchemaFactory.createForClass(Feasibility);
