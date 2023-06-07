import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { FdpgTaskType } from '../../enums/fdpg-task-type.enum';

export type FdpgTaskDocument = FdpgTask & Document;

@Schema({ _id: true })
export class FdpgTask {
  @Prop(String)
  type: FdpgTaskType;

  @Prop()
  _id: string;
}

export const FdpgTaskSchema = SchemaFactory.createForClass(FdpgTask);
