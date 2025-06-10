import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { DifeTypeOfUse } from '../../enums/dife-type-of-use.enum';
import { IsOptional, ValidateNested } from 'class-validator';
import { Expose } from 'class-transformer';
import { ExposeForDataSources } from 'src/shared/decorators/data-source.decorator';
import { PlatformIdentifier } from 'src/modules/admin/enums/platform-identifier.enum';

export type DifeVariableSelectionDataDocument = DifeVariableSelectionData & Document;

@Schema({ _id: false })
export class DifeVariableSelectionData {
  @Prop()
  typeOfUse?: DifeTypeOfUse;

  @Prop()
  typeOfUseExplanation?: string;
}
export const DifeVariableSelectionDataSchema = SchemaFactory.createForClass(DifeVariableSelectionData);

export type VariableSelectionDataDocument = VariableSelectionData & Document;
export class VariableSelectionData {
  @Prop({ type: DifeVariableSelectionDataSchema })
  DIFE?: DifeVariableSelectionData;

  _id?: string;

  @Prop({
    type: Boolean,
    default: false,
  })
  isDone: boolean;
}
export const VariableSelectionDataSchema = SchemaFactory.createForClass(VariableSelectionData);
