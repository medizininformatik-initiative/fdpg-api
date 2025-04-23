import { Exclude, Expose } from 'class-transformer';
import { IsEnum } from 'class-validator';
import { PlatformIdentifier } from 'src/modules/admin/enums/platform-identifier.enum';
import { IsNotEmptyString } from 'src/shared/validators/is-not-empty-string.validator';

@Exclude()
export class SelectedDataSourceDto {
  @Expose()
  @IsNotEmptyString()
  title: string;

  @Expose()
  @IsNotEmptyString()
  _id: string;

  @Expose()
  @IsNotEmptyString()
  description: string;

  @Expose()
  @IsEnum(PlatformIdentifier)
  tag: PlatformIdentifier;

  @Expose()
  @IsNotEmptyString()
  externalLink: string;
}
