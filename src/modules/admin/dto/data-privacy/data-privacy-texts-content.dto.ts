import { Exclude, Expose, Type } from 'class-transformer';
import { IsObject, ValidateNested } from 'class-validator';
import { MessagesDto } from '../../../../shared/dto/messages/messages.dto';

@Exclude()
export class DataPrivacyTextsContentDto {
  @Expose()
  @Type(() => MessagesDto)
  @IsObject()
  @ValidateNested()
  headline: MessagesDto;

  @Expose()
  @Type(() => MessagesDto)
  @IsObject()
  @ValidateNested()
  text: MessagesDto;
}
