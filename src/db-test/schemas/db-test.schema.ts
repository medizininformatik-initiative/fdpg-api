import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DbTestDocument = DbTest & Document;

@Schema()
export class DbTest {
  @Prop()
  id: string;

  @Prop()
  test: string;
}

export const DbTestSchema = SchemaFactory.createForClass(DbTest);
