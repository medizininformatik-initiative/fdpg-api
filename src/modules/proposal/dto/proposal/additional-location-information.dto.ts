import { Exclude, Expose, Transform } from 'class-transformer';
import { IsBoolean } from 'class-validator';
import { IsNotEmptyString } from 'src/shared/validators/is-not-empty-string.validator';

@Exclude()
export class AdditionalLocationInformationGetDto {
  @Expose()
  location: string;

  @Expose()
  @IsBoolean()
  @Transform((params) => (params.value === 'true' || params.value === true ? true : false))
  legalBasis: boolean;

  @Expose()
  @IsNotEmptyString()
  locationPublicationName: string;
}
