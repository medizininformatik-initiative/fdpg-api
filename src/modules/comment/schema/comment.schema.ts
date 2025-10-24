import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Model, Schema as MongooseSchema } from 'mongoose';
import { Owner, OwnerSchema } from 'src/shared/schema/owner.schema';
import { Version, VersionSchema } from 'src/shared/schema/version.schema';
import { CommentType } from '../enums/comment-type.enum';
import { ReferenceType } from '../enums/reference-type.enum';
import { Answer, AnswerSchema } from './answer.schema';
import { addLocationPreSaveHook, Location } from 'src/modules/location/schema/location.schema';

export type CommentDocument = Comment & Document;

@Schema()
export class Comment {
  @Prop()
  referenceDocumentId: string;

  @Prop()
  referenceObjectId: string;

  @Prop()
  fdpgTaskId?: string;

  @Prop()
  content: string;

  @Prop({ type: Boolean, default: false })
  isDone: boolean;

  @Prop({ type: [String], ref: () => Location })
  locations?: string[];

  @Prop({ type: OwnerSchema })
  owner: Owner;

  @Prop({ type: String, enum: CommentType })
  type: CommentType;

  @Prop([AnswerSchema])
  answers: Answer[];

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;

  @Prop({ type: Date, default: Date.now, immutable: true })
  createdAt: Date;

  @Prop({ type: VersionSchema })
  versionOfItem: Version;

  @Prop({ type: String, enum: ReferenceType })
  referenceType: ReferenceType;

  _id: string;
}

let CommentSchema: MongooseSchema = undefined;

const getCommentSchemaFactory = (locationModel: Model<Location>) => {
  if (CommentSchema) {
    return CommentSchema;
  }
  CommentSchema = SchemaFactory.createForClass(Comment);

  CommentSchema.index({ referenceDocumentId: 1 });

  addLocationPreSaveHook(CommentSchema, ['miiLocation'], locationModel);
  addLocationPreSaveHook(AnswerSchema, ['locations'], locationModel);
  addLocationPreSaveHook(OwnerSchema, ['miiLocation'], locationModel);

  return CommentSchema;
};

export { getCommentSchemaFactory };
