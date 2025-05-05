import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProposalFormDocument = ProposalForm & Document;

@Schema({ _id: true, collection: 'proposalForm' })
export class ProposalForm {
  _id: string;

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

  @Prop()
  formVersion: number;

  @Prop({ type: Object, default: {} })
  formSchema: object;
}

const ProposalFormSchema = SchemaFactory.createForClass(ProposalForm);

export { ProposalFormSchema };
