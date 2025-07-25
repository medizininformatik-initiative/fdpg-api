import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { DifeSelectionOfCasesEntries } from '../../enums/dife-selection-of-cases.enum';
import { Document } from 'mongoose';

export type SelectionOfCasesDocument = SelectionOfCases & Document;

@Schema({ _id: false })
export class DifeSelectionOfCases {
  @Prop()
  selectedCases: DifeSelectionOfCasesEntries[];

  @Prop()
  otherExplanation?: string;
}

export const DifeSelectionOfCasesSchema = SchemaFactory.createForClass(DifeSelectionOfCases);

@Schema()
export class SelectionOfCases {
  @Prop({ type: DifeSelectionOfCasesSchema })
  difeSelectionOfCases?: DifeSelectionOfCases;

  _id?: string;

  @Prop({
    type: Boolean,
    default: false,
  })
  isDone: boolean;
}

export const SelectionOfCasesSchema = SchemaFactory.createForClass(SelectionOfCases);
