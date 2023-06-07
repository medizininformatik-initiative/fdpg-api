import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ProposalTypeOfUse } from 'src/modules/proposal/enums/proposal-type-of-use.enum';
import { DataPrivacyTextsContent, DataPrivacyTextsContentSchema } from './data-privacy-texts-content.schema';

export type DataPrivacyTextsDocument = DataPrivacyTexts & Document;

@Schema({ _id: false })
export class DataPrivacyTexts {
  @Prop(DataPrivacyTextsContentSchema)
  [ProposalTypeOfUse.Biosample]: DataPrivacyTextsContent;

  @Prop(DataPrivacyTextsContentSchema)
  [ProposalTypeOfUse.Centralized]: DataPrivacyTextsContent;

  @Prop(DataPrivacyTextsContentSchema)
  [ProposalTypeOfUse.Distributed]: DataPrivacyTextsContent;
}

const DataPrivacyTextsSchema = SchemaFactory.createForClass(DataPrivacyTexts);

export { DataPrivacyTextsSchema };
