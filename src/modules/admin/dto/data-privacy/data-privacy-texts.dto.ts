import { Exclude, Expose, Type } from 'class-transformer';
import { IsObject, ValidateNested } from 'class-validator';
import { ProposalTypeOfUse } from 'src/modules/proposal/enums/proposal-type-of-use.enum';
import { DataPrivacyTextsContentDto } from './data-privacy-texts-content.dto';

type DataPrivacyTextsDtoType = Record<ProposalTypeOfUse, DataPrivacyTextsContentDto>;

export type DataPrivacyTextsContentKeys = {
  [key in keyof DataPrivacyTextsContentDto]: string;
};

export type DataPrivacyTextSingleLanguage = {
  [key in keyof DataPrivacyTextsDto]: DataPrivacyTextsContentKeys;
};

@Exclude()
export class DataPrivacyTextsDto implements DataPrivacyTextsDtoType {
  @Expose()
  @IsObject()
  @ValidateNested()
  @Type(() => DataPrivacyTextsContentDto)
  BIOSAMPLE: DataPrivacyTextsContentDto;

  @Expose()
  @IsObject()
  @ValidateNested()
  @Type(() => DataPrivacyTextsContentDto)
  CENTRALIZED: DataPrivacyTextsContentDto;

  @Expose()
  @IsObject()
  @ValidateNested()
  @Type(() => DataPrivacyTextsContentDto)
  DISTRIBUTED: DataPrivacyTextsContentDto;
}
