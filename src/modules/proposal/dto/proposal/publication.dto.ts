import { Exclude, Expose } from 'class-transformer';
import { ExposeId } from 'src/shared/decorators/transform/expose-id.decorator';
import { isNotEmptyString } from 'src/shared/validators/is-not-empty-string.validator';
import { ValidateWhenEmpty } from 'src/shared/validators/validate-when-empty.validator';

@Exclude()
export class PublicationBaseDto {
  @Expose()
  title: string;

  @Expose()
  @ValidateWhenEmpty({
    otherField: 'link',
    validation: isNotEmptyString,
    otherFieldValidation: isNotEmptyString,
    defaultResetValue: undefined,
  })
  doi?: string;

  @Expose()
  @ValidateWhenEmpty({
    otherField: 'doi',
    validation: isNotEmptyString,
    otherFieldValidation: isNotEmptyString,
    defaultResetValue: undefined,
  })
  link?: string;
}

@Exclude()
export class PublicationCreateDto extends PublicationBaseDto {}

@Exclude()
export class PublicationUpdateDto extends PublicationBaseDto {}

@Exclude()
export class PublicationGetDto extends PublicationBaseDto {
  @ExposeId()
  _id: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
