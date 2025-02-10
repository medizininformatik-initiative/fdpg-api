import { Exclude, Expose, Transform } from 'class-transformer';
import { IsBoolean } from 'class-validator';

@Exclude()
export class SetAdditionalLocationInformationDto {
  @Expose()
  @IsBoolean()
  @Transform((params) => (params.value === 'true' || params.value === true ? true : false))
  legalBasis: boolean;

  @Expose()
  locationPublicationName: string;
}
