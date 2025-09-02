import { Exclude, Expose } from 'class-transformer';
import { IsString } from 'class-validator';

@Exclude()
export class DataPrivacyTextsContentDto {
  @Expose()
  @IsString()
  headline: string;

  @Expose()
  @IsString()
  text: string;
}
