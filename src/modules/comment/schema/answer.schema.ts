import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Owner, OwnerSchema } from 'src/shared/schema/owner.schema';
import { Version, VersionSchema } from 'src/shared/schema/version.schema';
import { Document } from 'mongoose';
import { Location } from 'src/modules/location/schema/location.schema';

export type AnswerDocument = Answer & Document;

@Schema()
export class Answer {
  @Prop()
  content: string;

  @Prop({ type: Boolean, default: false })
  isDone: boolean;

  @Prop()
  fdpgTaskId?: string;

  @Prop({ type: [String], ref: () => Location })
  locations?: string[];

  @Prop({ type: OwnerSchema })
  owner: Owner;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;

  @Prop({ type: Date, default: Date.now, immutable: true })
  createdAt: Date;

  @Prop({ type: VersionSchema })
  versionOfItem: Version;

  _id: string;
}

const AnswerSchema = SchemaFactory.createForClass(Answer);

export { AnswerSchema };
