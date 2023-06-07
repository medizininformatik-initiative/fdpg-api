import { Exclude, Expose, Type } from 'class-transformer';
import { IsEnum, ValidateNested } from 'class-validator';
import { MessageMapDto } from '../../../../shared/dto/messages/message-map.dto';
import { ConfigType } from '../../enums/config-type.enum';
import { PlatformIdentifier } from '../../enums/platform-identifier.enum';
import { TermsDto } from './terms.dto';

@Exclude()
export class TermsConfigBaseDto {
  @Exclude()
  type: ConfigType.TermsDialog;

  @Expose()
  @Type(() => TermsDto)
  @ValidateNested()
  terms: TermsDto[];

  @Expose()
  @Type(() => MessageMapDto)
  @ValidateNested()
  messages: MessageMapDto;

  @Exclude()
  updatedAt: Date;

  @Exclude()
  createdAt: Date;

  @Exclude()
  _id: string;
}

@Exclude()
export class TermsConfigCreateDto extends TermsConfigBaseDto {}

@Exclude()
export class TermsConfigGetDto extends TermsConfigBaseDto {
  @Expose()
  @IsEnum(PlatformIdentifier)
  platform: PlatformIdentifier;
}
