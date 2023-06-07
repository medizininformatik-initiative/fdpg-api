import { Exclude, Expose } from 'class-transformer';
import { SupportedLanguages } from 'src/shared/constants/global.constants';
import { IsNotEmptyString } from 'src/shared/validators/is-not-empty-string.validator';

type MessagesDtoType = Record<SupportedLanguages, string>;

@Exclude()
export class MessagesDto implements MessagesDtoType {
  @Expose()
  @IsNotEmptyString()
  en: string;

  @Expose()
  @IsNotEmptyString()
  de: string;
}
