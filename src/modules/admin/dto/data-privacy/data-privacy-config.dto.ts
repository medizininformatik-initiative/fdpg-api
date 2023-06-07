import { Exclude, Expose, Type } from 'class-transformer';
import { IsEnum, ValidateNested } from 'class-validator';
import { ConfigType } from '../../enums/config-type.enum';
import { PlatformIdentifier } from '../../enums/platform-identifier.enum';
import { DataPrivacyTextsDto } from './data-privacy-texts.dto';

@Exclude()
export class DataPrivacyConfigBaseDto {
  @Expose()
  @Type(() => DataPrivacyTextsDto)
  @ValidateNested()
  messages: DataPrivacyTextsDto;
}

@Exclude()
export class DataPrivacyConfigCreateDto extends DataPrivacyConfigBaseDto {}

@Exclude()
export class DataPrivacyConfigGetDto extends DataPrivacyConfigBaseDto {
  @Expose()
  @IsEnum(PlatformIdentifier)
  platform: PlatformIdentifier;

  @Exclude()
  updatedAt: Date;

  @Exclude()
  createdAt: Date;

  @Exclude()
  _id: string;

  @Exclude()
  type: ConfigType.DataPrivacy;
}
