import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { AppDbIdentifier } from '../enums/app-db-identifier.enum';

export type MigrationDocument = Migration & Document;

@Schema({ _id: true, collection: 'app' })
export class Migration {
  @Prop({
    type: Number,
    default: 0,
  })
  dbVersion: number;

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
    type: String,
    default: AppDbIdentifier.Migration,
    unique: true,
  })
  id: string;
}

const MigrationSchema = SchemaFactory.createForClass(Migration);
// MigrationSchema.index({ id: 1 });

export { MigrationSchema };
