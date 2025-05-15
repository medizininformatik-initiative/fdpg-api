import { Exclude, Expose, Type } from 'class-transformer';
import { IsObject, ValidateNested } from 'class-validator';
import { ProposalTypeOfUse } from 'src/modules/proposal/enums/proposal-type-of-use.enum';
import { DIFEProposalTypeOfUse } from 'src/modules/proposal/enums/proposal-type-of-use.enum';
import { DataPrivacyTextsContentDto } from './data-privacy-texts-content.dto';

type DataPrivacyTextsDtoType = Partial<
  Record<ProposalTypeOfUse | DIFEProposalTypeOfUse, DataPrivacyTextsContentDto>
> & {
  all?: DataPrivacyTextsContentDto;
};

export type DataPrivacyTextsContentKeys = {
  [key in keyof DataPrivacyTextsContentDto]: string;
};

export type DataPrivacyTextSingleLanguage = {
  [key in keyof DataPrivacyTextsDto]: DataPrivacyTextsContentKeys;
};

@Exclude()
export class DataPrivacyTextsDto implements DataPrivacyTextsDtoType {
  // MII specific types
  @Expose()
  @IsObject()
  @ValidateNested()
  @Type(() => DataPrivacyTextsContentDto)
  [ProposalTypeOfUse.Biosample]?: DataPrivacyTextsContentDto;

  @Expose()
  @IsObject()
  @ValidateNested()
  @Type(() => DataPrivacyTextsContentDto)
  [ProposalTypeOfUse.Centralized]?: DataPrivacyTextsContentDto;

  @Expose()
  @IsObject()
  @ValidateNested()
  @Type(() => DataPrivacyTextsContentDto)
  [ProposalTypeOfUse.Distributed]?: DataPrivacyTextsContentDto;

  // DIFE specific types
  @Expose()
  @IsObject()
  @ValidateNested()
  @Type(() => DataPrivacyTextsContentDto)
  [DIFEProposalTypeOfUse.DATA_SHIELD]?: DataPrivacyTextsContentDto;

  @Expose()
  @IsObject()
  @ValidateNested()
  @Type(() => DataPrivacyTextsContentDto)
  [DIFEProposalTypeOfUse.EXTERNAL_SR]?: DataPrivacyTextsContentDto;

  @Expose()
  @IsObject()
  @ValidateNested()
  @Type(() => DataPrivacyTextsContentDto)
  [DIFEProposalTypeOfUse.INTERNAL_SR]?: DataPrivacyTextsContentDto;

  // Common field for DIFE
  @Expose()
  @IsObject()
  @ValidateNested()
  @Type(() => DataPrivacyTextsContentDto)
  all?: DataPrivacyTextsContentDto;
}
