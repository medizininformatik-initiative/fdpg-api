import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EthicVoteDocument = EthicVote & Document;

@Schema({ _id: true })
export class EthicVote {
  @Prop()
  isExisting: boolean;

  @Prop()
  admitReputationOfAttachment: boolean;

  @Prop()
  ethicsCommittee: string;

  @Prop()
  ethicsVoteNumber: string;

  @Prop()
  voteFromDate: Date;

  _id: string;

  @Prop({
    type: Boolean,
    default: false,
  })
  isDone: boolean;
}

export const EthicVoteSchema = SchemaFactory.createForClass(EthicVote);
