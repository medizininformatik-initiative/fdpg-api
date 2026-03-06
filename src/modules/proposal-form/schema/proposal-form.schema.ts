import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ApplicationFormSchemaValueType = {
  [key: string]:
    | {
        value: string | number | undefined | null;
        type: 'textfield' | 'datepicker' | 'richtext' | 'checkbox' | 'select';
        format?: 'email' | 'number' | 'single' | 'multiple';
      }
    | ApplicationFormSchemaValueType[]
    | ApplicationFormSchemaValueType;
};

export type ApplicationFormSchemaType = {
  [key: string]:
    | {
        type: 'textfield' | 'datepicker' | 'richtext' | 'checkbox' | 'select';
        format?: 'email' | 'number' | 'single' | 'multiple';
      }
    | ApplicationFormSchemaType[]
    | ApplicationFormSchemaType;
};

export type ProposalFormDocument = ProposalForm & Document;

@Schema({ _id: true, collection: 'proposalForm', minimize: false })
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
  formSchema: ApplicationFormSchemaType;
}

const ProposalFormSchema = SchemaFactory.createForClass(ProposalForm);

export { ProposalFormSchema };
