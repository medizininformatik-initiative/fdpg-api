import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { DifeTypeOfUse } from '../../enums/dife-type-of-use.enum';

export type VariableSelectionDataDocument = VariableSelectionData & Document;
@Schema({ _id: false })
export class VariableSelectionData {}
export const VariableSelectionDataSchema = SchemaFactory.createForClass(VariableSelectionData);

export type DifeVariableSelectionDataDocument = DifeVariableSelectionData & Document;
@Schema({ _id: false })
export class DifeVariableSelectionData {
  @Prop()
  typeOfUse?: DifeTypeOfUse;

  @Prop()
  typeOfUseExplanation?: string;
}
export const DifeVariableSelectionDataSchema = SchemaFactory.createForClass(DifeVariableSelectionData);
