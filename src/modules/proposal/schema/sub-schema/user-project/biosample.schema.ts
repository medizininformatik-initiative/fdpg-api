import { Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BiosampleType } from 'src/modules/proposal/enums/biosample-type.enum';
import { BiosampleCode } from 'src/modules/proposal/enums/biosample-code.enum';

export type BiosampleDocument = Biosample & Document;

@Schema({ _id: true })
export class Biosample {
  @Prop()
  type: BiosampleType;

  @Prop()
  typeDetails: string;

  @Prop()
  count: string;

  @Prop()
  requirements: string;

  @Prop()
  optionalBiosample: boolean;

  @Prop([String])
  sampleCode: BiosampleCode[];

  @Prop()
  [BiosampleCode.SNOMED]?: string;

  @Prop()
  [BiosampleCode.SPREC]?: string;

  @Prop()
  method: string;

  @Prop()
  externalLabTransfer: boolean;

  @Prop()
  externalLabTransferDetails: string;

  _id: string;
}

export const BiosampleSchema = SchemaFactory.createForClass(Biosample);
