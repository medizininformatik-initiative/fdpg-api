import { Exclude, Expose } from 'class-transformer';
import { IsObject } from 'class-validator';
import { SupportedLanguages } from 'src/shared/constants/global.constants';

type MessageMapDtoType = Record<SupportedLanguages, Record<string, string>>;

@Exclude()
export class MessageMapDto implements MessageMapDtoType {
  @Expose()
  @IsObject()
  en: Record<string, string>;

  @Expose()
  @IsObject()
  de: Record<string, string>;
}
