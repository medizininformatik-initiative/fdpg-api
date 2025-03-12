import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { IChecklistItem } from '../../dto/proposal/checklist.types';
import { DEFAULT_CHECKLIST_ITEMS, DEFAULT_PROJECT_PROPERTIES } from '../../utils/checklist.utils';

export type FdpgChecklistDocument = FdpgChecklist & Document;

const checklistOptionSchema = {
  optionValue: { type: String, required: true },
};

const checklistItemSchema = {
  _id: { type: Types.ObjectId, auto: true, required: false },
  questionKey: { type: String, required: true },
  comment: { type: String, default: null, required: false },
  isMultiple: { type: Boolean, required: true },
  options: [checklistOptionSchema],
  answer: { type: [String], required: true },
  sublist: { type: Array, default: [] },
  isAnswered: { type: Boolean, default: false },
};

@Schema({ _id: false })
export class FdpgChecklist {
  @Prop({ type: Boolean, default: false })
  isRegistrationLinkSent: boolean = false;

  @Prop({
    type: [{ ...checklistItemSchema, sublist: [checklistItemSchema] }],
    default: DEFAULT_CHECKLIST_ITEMS,
  })
  checkListVerification: IChecklistItem[] = DEFAULT_CHECKLIST_ITEMS;

  @Prop({
    type: {
      date: { type: Date, required: false },
      user: { type: String, required: false },
      note: { type: String, required: false },
    },
    default: null,
  })
  fdpgInternalCheckNotes: { date?: Date; user?: string; note?: string } | null = null;

  @Prop({
    type: [{ ...checklistItemSchema, sublist: [checklistItemSchema] }],
    default: DEFAULT_PROJECT_PROPERTIES,
  })
  projectProperties: IChecklistItem[] = DEFAULT_PROJECT_PROPERTIES;
}

export const FdpgChecklistSchema = SchemaFactory.createForClass(FdpgChecklist);
