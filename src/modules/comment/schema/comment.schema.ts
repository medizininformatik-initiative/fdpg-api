import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { MiiLocation } from 'src/shared/constants/mii-locations';
import { Owner, OwnerSchema } from 'src/shared/schema/owner.schema';
import { Version, VersionSchema } from 'src/shared/schema/version.schema';
import { CommentType } from '../enums/comment-type.enum';
import { ReferenceType } from '../enums/reference-type.enum';
import { Answer, AnswerSchema } from './answer.schema';

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

  @Prop({
    type: Boolean,
    default: false,
  })
  isDone: boolean;

  @Prop([String])
  locations?: MiiLocation[];

  @Prop({ type: OwnerSchema })
  owner: Owner;

  @Prop({
    type: String,
    enum: CommentType,
  })
  type: CommentType;

  @Prop([AnswerSchema])
  answers: Answer[];

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

  @Prop({ type: VersionSchema })
  versionOfItem: Version;

  @Prop({
    type: String,
    enum: ReferenceType,
  })
  referenceType: ReferenceType;

  _id: string;
}

const CommentSchema = SchemaFactory.createForClass(Comment);

CommentSchema.index({ referenceDocumentId: 1 });

export { CommentSchema };
